import { Bank, BANK_CONFIG } from '../types/bank';
import type { BotSession } from '../types/workspace';
import { WorkspaceService } from '../services/workspace-service';
import { GoogleSheetsService } from '../services/google-sheets-service';
import { parseBankFile } from '../parsers/parse-bank-file';
import { applyHighConfidenceCategories } from '../utils/apply-high-confidence-categories';
import { getCachedModel } from '../services/model-store';
import type { CategorizationPrediction } from '../types/categorization';
import type { Transaction } from '../types/transaction';
import {
  formatCategorySummary,
  formatParseSummary,
  formatUploadSummary,
} from './summaries';
import type {
  BotDeps,
  InlineButton,
  TelegramCallbackQuery,
  TelegramChatMemberUpdated,
  TelegramMessage,
  TelegramUpdate,
} from './types';

const JOIN_CB = 'join';
const WHO_PREFIX = 'who:';
const BANK_PREFIX = 'bank:';
const RECOGNIZE_YES = 'rec:yes';
const RECOGNIZE_SKIP = 'rec:skip';
const DRY_RUN = 'up:dry';
const UPLOAD = 'up:yes';
const CANCEL = 'up:cancel';

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  deps: BotDeps,
  requestHeaders?: Headers
): Promise<Response> {
  if (deps.webhookSecret && requestHeaders) {
    const secret = requestHeaders.get('x-telegram-bot-api-secret-token');
    if (secret !== deps.webhookSecret) {
      console.warn('[bot] rejected update: bad webhook secret');
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    if (update.my_chat_member) {
      console.log('[bot] handle my_chat_member');
      await handleMyChatMember(update.my_chat_member, deps);
    } else if (update.callback_query) {
      console.log('[bot] handle callback_query', update.callback_query.data);
      await handleCallback(update.callback_query, deps);
    } else {
      const msg = update.channel_post || update.message;
      if (msg) {
        console.log(
          '[bot] handle message',
          JSON.stringify({
            chatId: msg.chat.id,
            chatType: msg.chat.type,
            hasDocument: Boolean(msg.document),
            fileName: msg.document?.file_name,
            text: msg.text?.slice(0, 80),
          })
        );
        await handleMessage(msg, deps);
      } else {
        console.log('[bot] update ignored (no message/callback/member)');
      }
    }
    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('[bot] Telegram update error:', error);
    return new Response('ok', { status: 200 });
  }
}

async function handleMyChatMember(
  update: TelegramChatMemberUpdated,
  deps: BotDeps
): Promise<void> {
  const status = update.new_chat_member.status;
  const isBot = update.new_chat_member.user.is_bot;
  if (!isBot) return;
  if (status !== 'administrator' && status !== 'member') return;

  const ws = new WorkspaceService(deps.store);
  const adderId = update.from.id;
  const workspaceId = await ws.getTelegramWorkspace(adderId);
  if (!workspaceId) {
    await deps.telegram.sendMessage(
      update.chat.id,
      'Connect Telegram from the web app Settings first, then add me again (or tap Join after linking).'
    );
    return;
  }

  const ids = await ws.appendChatWorkspace(update.chat.id, workspaceId);
  const labels = await memberLabels(ws, ids);
  await deps.telegram.sendMessage(
    update.chat.id,
    `Linked. People on this channel: ${labels.join(', ') || '(none yet)'}.\nOthers: tap Join after Connect Telegram in Settings.`,
    {
      buttons: [[{ text: 'Join this channel', callbackData: JOIN_CB }]],
    }
  );
}

const NEWFILE_CMD = /^\/newfile(?:@\w+)?(?:\s|$)/i;

function isGroupChat(chatType: string): boolean {
  return chatType === 'group' || chatType === 'supergroup';
}

async function handleMessage(msg: TelegramMessage, deps: BotDeps): Promise<void> {
  const ws = new WorkspaceService(deps.store);

  // DM /start pairing
  if (msg.chat.type === 'private' && msg.text?.startsWith('/start')) {
    const token = msg.text.split(/\s+/)[1];
    if (!token || !msg.from) {
      await deps.telegram.sendMessage(
        msg.chat.id,
        'Open Connect Telegram from the web app Settings to get a link.'
      );
      return;
    }
    const workspaceId = await ws.consumePairingToken(token);
    if (!workspaceId) {
      await deps.telegram.sendMessage(msg.chat.id, 'This link expired. Generate a new one in Settings.');
      return;
    }
    await ws.linkTelegramUser(msg.from.id, workspaceId);
    await deps.telegram.sendMessage(
      msg.chat.id,
      'Telegram linked. Add this bot to your expense channel (as admin), or tap Join if it is already there.'
    );
    return;
  }

  // /newfile — ask user to reply with the statement (works with group privacy mode)
  if (msg.text && NEWFILE_CMD.test(msg.text.trim())) {
    await handleNewFileCommand(msg, deps);
    return;
  }

  if (!msg.document) {
    console.log(
      '[bot] message has no document — ignoring (chat type=%s). In groups use /newfile then reply with the file.',
      msg.chat.type
    );
    return;
  }

  const chatId = msg.chat.id;
  const captionIsNewFile = Boolean(msg.caption && NEWFILE_CMD.test(msg.caption.trim()));
  const awaiting = await ws.getAwaitingFile(chatId);
  const isReplyToPrompt =
    awaiting &&
    msg.reply_to_message?.message_id === awaiting.promptMessageId;

  // Groups: only accept docs after /newfile (reply to prompt) or caption /newfile
  if (isGroupChat(msg.chat.type) && !isReplyToPrompt && !captionIsNewFile) {
    console.log('[bot] group document ignored — not a /newfile reply or caption');
    await deps.telegram.sendMessage(
      chatId,
      'To import a file with privacy mode on, send /newfile then reply to my message with the bank file.',
      { replyToMessageId: msg.message_id }
    );
    return;
  }

  if (isReplyToPrompt) {
    await ws.clearAwaitingFile(chatId);
  }

  console.log('[bot] document received', msg.document.file_name, 'chat', chatId);
  await startDocumentImport(msg, deps);
}

async function handleNewFileCommand(msg: TelegramMessage, deps: BotDeps): Promise<void> {
  const ws = new WorkspaceService(deps.store);
  const chatId = msg.chat.id;

  const bound = await ws.getChatWorkspaces(chatId);
  if (bound.length === 0) {
    await deps.telegram.sendMessage(
      chatId,
      'This chat is not linked. Connect Telegram in Settings, add the bot, or tap Join.',
      { replyToMessageId: msg.message_id }
    );
    return;
  }

  if (msg.from) {
    const allowed = await ws.isLinkedToChat(msg.from.id, chatId);
    if (!allowed) {
      await deps.telegram.sendMessage(
        chatId,
        'You are not linked to this chat. Connect Telegram in Settings, then tap Join.',
        { replyToMessageId: msg.message_id }
      );
      return;
    }
  }

  const prompt = await deps.telegram.sendMessage(
    chatId,
    'Reply to this message with your bank file (CSV / XML / XLSX).',
    { replyToMessageId: msg.message_id }
  );

  await ws.setAwaitingFile({
    chatId: String(chatId),
    promptMessageId: prompt.messageId,
    requestedByTelegramId: msg.from?.id,
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
  console.log('[bot] awaiting file reply', { chatId, promptMessageId: prompt.messageId });
}

async function startDocumentImport(msg: TelegramMessage, deps: BotDeps): Promise<void> {
  if (!msg.document) return;
  const ws = new WorkspaceService(deps.store);
  const chatId = msg.chat.id;

  const bound = await ws.getChatWorkspaces(chatId);
  if (bound.length === 0) {
    console.warn('[bot] chat not bound to any workspace', chatId);
    await deps.telegram.sendMessage(
      chatId,
      'This channel is not linked. Connect Telegram in Settings, add the bot, or tap Join.',
      { replyToMessageId: msg.message_id }
    );
    return;
  }
  console.log('[bot] bound workspaces', bound);

  const members = await ws.listChatMembers(chatId);
  const session: BotSession = {
    chatId: String(chatId),
    documentMessageId: msg.message_id,
    fileId: msg.document.file_id,
    fileName: msg.document.file_name || 'statement',
    step: members.length === 1 ? 'bank' : 'who',
  };

  if (members.length === 1) {
    session.workspaceId = members[0].workspaceId;
    session.memberId = members[0].member.id;
  }

  const reply = await deps.telegram.sendMessage(
    chatId,
    members.length === 1
      ? `File for ${members[0].member.name}. Which bank?`
      : 'Who is this file for?',
    {
      replyToMessageId: msg.message_id,
      buttons:
        members.length === 1
          ? bankButtons(members[0].member.allowedBanks)
          : whoButtons(members),
    }
  );
  session.replyMessageId = reply.messageId;
  await ws.saveSession(session);
}

async function handleCallback(cq: TelegramCallbackQuery, deps: BotDeps): Promise<void> {
  const ws = new WorkspaceService(deps.store);
  const data = cq.data || '';
  const chatId = cq.message?.chat.id;
  if (chatId === undefined) {
    await deps.telegram.answerCallbackQuery(cq.id);
    return;
  }

  if (data === JOIN_CB) {
    const workspaceId = await ws.getTelegramWorkspace(cq.from.id);
    if (!workspaceId) {
      await deps.telegram.answerCallbackQuery(cq.id, 'Link Telegram in Settings first');
      return;
    }
    const ids = await ws.appendChatWorkspace(chatId, workspaceId);
    const labels = await memberLabels(ws, ids);
    await deps.telegram.answerCallbackQuery(cq.id, 'Joined');
    if (cq.message) {
      await deps.telegram.editMessage(
        chatId,
        cq.message.message_id,
        `Linked. People on this channel: ${labels.join(', ')}.`
      );
    }
    return;
  }

  const session = cq.message
    ? await ws.findSessionByReplyMessage(chatId, cq.message.message_id)
    : null;
  if (!session) {
    await deps.telegram.answerCallbackQuery(cq.id, 'Session expired — re-upload the file');
    return;
  }

  const allowed = await ws.isLinkedToChat(cq.from.id, chatId);
  if (!allowed) {
    await deps.telegram.answerCallbackQuery(cq.id, 'Not authorized for this channel');
    return;
  }

  if (data.startsWith(WHO_PREFIX)) {
    const index = parseInt(data.slice(WHO_PREFIX.length), 10);
    const members = await ws.listChatMembers(chatId);
    const chosen = members[index];
    if (!chosen) {
      await deps.telegram.answerCallbackQuery(cq.id, 'Invalid choice');
      return;
    }
    session.workspaceId = chosen.workspaceId;
    session.memberId = chosen.member.id;
    session.step = 'bank';
    await ws.saveSession(session);
    await deps.telegram.answerCallbackQuery(cq.id);
    await editSessionReply(
      deps,
      session,
      `File for ${chosen.member.name}. Which bank?`,
      bankButtons(chosen.member.allowedBanks)
    );
    return;
  }

  if (data.startsWith(BANK_PREFIX)) {
    const bank = data.slice(BANK_PREFIX.length) as Bank;
    session.bank = bank;
    session.step = 'recognize';
    await ws.saveSession(session);
    await deps.telegram.answerCallbackQuery(cq.id, 'Parsing…');

    const { transactions } = await downloadAndParse(deps, session);
    const summary = formatParseSummary(transactions, session.fileName);
    await editSessionReply(deps, session, `${summary}\n\nRun recognition?`, [
      [
        { text: 'Run recognition', callbackData: RECOGNIZE_YES },
        { text: 'Skip', callbackData: RECOGNIZE_SKIP },
      ],
    ]);
    return;
  }

  if (data === RECOGNIZE_YES || data === RECOGNIZE_SKIP) {
    session.categorized = data === RECOGNIZE_YES;
    session.step = 'upload_choice';
    await ws.saveSession(session);
    await deps.telegram.answerCallbackQuery(cq.id);

    let text = '';
    if (data === RECOGNIZE_YES) {
      const { transactions, predictions, modelMissing } = await downloadParseAndCategorize(
        deps,
        session
      );
      const catLine = modelMissing
        ? 'No ML model synced for this person. In the web app: select them on Home, train in Settings (with api:dev running + Google Sheets authorized), then retry.'
        : formatCategorySummary(predictions);
      text = `${formatParseSummary(transactions, session.fileName)}\n\n${catLine}\n\nDry run or upload?`;
    } else {
      const { transactions } = await downloadAndParse(deps, session);
      text = `${formatParseSummary(transactions, session.fileName)}\n\nCategories skipped.\n\nDry run or upload?`;
    }

    await editSessionReply(deps, session, text, [
      [
        { text: 'Dry run', callbackData: DRY_RUN },
        { text: 'Upload', callbackData: UPLOAD },
      ],
      [{ text: 'Cancel', callbackData: CANCEL }],
    ]);
    return;
  }

  if (data === DRY_RUN) {
    await deps.telegram.answerCallbackQuery(cq.id, 'Dry run…');
    const result = await runImport(deps, session, true);
    session.step = 'after_dry_run';
    await ws.saveSession(session);
    await editSessionReply(
      deps,
      session,
      `${formatUploadSummary(result, true)}\n\nUpload results?`,
      [
        [
          { text: 'Upload', callbackData: UPLOAD },
          { text: 'Cancel', callbackData: CANCEL },
        ],
      ]
    );
    return;
  }

  if (data === UPLOAD) {
    await deps.telegram.answerCallbackQuery(cq.id, 'Uploading…');
    const result = await runImport(deps, session, false);
    session.step = 'done';
    await ws.saveSession(session);
    await editSessionReply(deps, session, formatUploadSummary(result, false));
    await ws.deleteSession(session.chatId, session.documentMessageId);
    return;
  }

  if (data === CANCEL) {
    await deps.telegram.answerCallbackQuery(cq.id, 'Cancelled');
    await editSessionReply(deps, session, 'Cancelled.');
    await ws.deleteSession(session.chatId, session.documentMessageId);
  }
}

async function applyWorkspaceFxKey(deps: BotDeps, session: BotSession): Promise<void> {
  if (!session.workspaceId) return;
  const ws = new WorkspaceService(deps.store);
  const settings = await ws.getSettings(session.workspaceId);
  if (settings?.exchangeratesApiKey) {
    process.env.EXCHANGERATES_API_KEY =
      process.env.EXCHANGERATES_API_KEY || settings.exchangeratesApiKey;
  }
}

async function downloadAndParse(
  deps: BotDeps,
  session: BotSession
): Promise<{ transactions: Transaction[] }> {
  if (!session.bank) throw new Error('Bank not selected');
  await applyWorkspaceFxKey(deps, session);
  const { bytes, fileName } = await deps.telegram.downloadFile(session.fileId);
  const file = new File([bytes], fileName || session.fileName);
  const transactions = await parseBankFile(session.bank, file);
  return { transactions };
}

async function downloadParseAndCategorize(
  deps: BotDeps,
  session: BotSession
): Promise<{
  transactions: Transaction[];
  predictions: CategorizationPrediction[];
  modelMissing?: boolean;
}> {
  const { transactions } = await downloadAndParse(deps, session);
  if (!session.workspaceId || !session.memberId) {
    return { transactions, predictions: [], modelMissing: true };
  }

  const ml = await getCachedModel(deps.store, session.workspaceId, session.memberId);
  if (!ml) {
    console.log('[bot] no ML model for', session.workspaceId, session.memberId);
    return { transactions, predictions: [], modelMissing: true };
  }

  const predictions: CategorizationPrediction[] = [];
  for (const transaction of transactions) {
    const result = await ml.predictCategory(transaction);
    predictions.push({ transaction, result, isManualOverride: false });
  }
  const updated = applyHighConfidenceCategories(transactions, predictions);
  // Mutate list for return
  transactions.splice(0, transactions.length, ...updated);
  return { transactions, predictions };
}

async function runImport(deps: BotDeps, session: BotSession, dryRun: boolean) {
  const ws = new WorkspaceService(deps.store);
  if (!session.workspaceId || !session.memberId || !session.bank) {
    throw new Error('Incomplete session');
  }
  const settings = await ws.getSettings(session.workspaceId);
  if (!settings?.googleSheetsId) {
    throw new Error('No Google Sheets ID in workspace settings');
  }
  const member = settings.members.find((m) => m.id === session.memberId);
  if (!member) throw new Error('Member not found');

  let { transactions } = await downloadAndParse(deps, session);
  if (session.categorized) {
    const cat = await downloadParseAndCategorize(deps, session);
    transactions = cat.transactions;
  }

  // Apply workspace FX key for SEK banks via env for this request
  if (settings.exchangeratesApiKey) {
    process.env.EXCHANGERATES_API_KEY =
      process.env.EXCHANGERATES_API_KEY || settings.exchangeratesApiKey;
  }

  const sheetsService = GoogleSheetsService.getInstance();
  const context = sheetsService.createContext(session.bank, member.name);
  return deps.sheets.importToSheets(transactions, context, settings.googleSheetsId, {
    dryRun,
  });
}

function whoButtons(
  members: Array<{ workspaceId: string; member: { id: string; name: string } }>
): InlineButton[][] {
  // Use index — callback_data max 64 bytes
  const row: InlineButton[] = members.map((m, i) => ({
    text: m.member.name,
    callbackData: `${WHO_PREFIX}${i}`,
  }));
  const rows: InlineButton[][] = [];
  for (let i = 0; i < row.length; i += 2) {
    rows.push(row.slice(i, i + 2));
  }
  return rows;
}

function bankButtons(banks: Bank[]): InlineButton[][] {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < banks.length; i += 2) {
    rows.push(
      banks.slice(i, i + 2).map((b) => ({
        text: BANK_CONFIG[b].name,
        callbackData: `${BANK_PREFIX}${b}`,
      }))
    );
  }
  return rows;
}

async function memberLabels(ws: WorkspaceService, workspaceIds: string[]): Promise<string[]> {
  const names: string[] = [];
  for (const id of workspaceIds) {
    const s = await ws.getSettings(id);
    for (const m of s?.members || []) names.push(m.name);
  }
  return names;
}

async function editSessionReply(
  deps: BotDeps,
  session: BotSession,
  text: string,
  buttons?: InlineButton[][]
): Promise<void> {
  if (!session.replyMessageId) return;
  await deps.telegram.editMessage(session.chatId, session.replyMessageId, text, { buttons });
}
