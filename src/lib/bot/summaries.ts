import type { Transaction } from '../types/transaction';
import type { UploadResult } from '../types/upload-result';
import type { CategorizationPrediction } from '../types/categorization';

const MAX_SAMPLES = 5;

export function formatParseSummary(transactions: Transaction[], fileName: string): string {
  if (transactions.length === 0) {
    return `Parsed 0 transactions from ${fileName}.`;
  }
  const dates = transactions.map((t) => t.date).filter(Boolean);
  const totalEur = transactions.reduce((s, t) => s + (t.amountEur || 0), 0);
  const samples = transactions
    .slice(0, MAX_SAMPLES)
    .map((t) => `• ${t.date} ${t.payee} ${t.amountEur?.toFixed(2)}€`)
    .join('\n');
  return [
    `Parsed ${transactions.length} transactions from ${fileName}.`,
    `Date range: ${dates[0] || '?'} → ${dates[dates.length - 1] || '?'}`,
    `Total EUR: ${totalEur.toFixed(2)}`,
    samples,
    transactions.length > MAX_SAMPLES ? `…and ${transactions.length - MAX_SAMPLES} more` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatCategorySummary(
  predictions: CategorizationPrediction[]
): string {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const p of predictions) {
    const c = p.result.confidence;
    if (c >= 0.8) high++;
    else if (c >= 0.6) medium++;
    else low++;
  }
  const samples = predictions
    .slice(0, MAX_SAMPLES)
    .map(
      (p) =>
        `• ${p.transaction.payee}: ${p.result.category} (${(p.result.confidence * 100).toFixed(0)}%)`
    )
    .join('\n');
  return [
    `Recognition: High ≥80%: ${high}, Medium: ${medium}, Low: ${low}`,
    samples,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatUploadSummary(result: UploadResult, dryRun: boolean): string {
  if (!result.success) {
    return `Failed: ${result.error || 'Unknown error'}`;
  }
  const samples = (result.newTransactions || [])
    .slice(0, MAX_SAMPLES)
    .map((t) => `• ${t.date} ${t.payee} ${t.amountEur?.toFixed(2)}€`)
    .join('\n');
  return [
    dryRun ? 'Dry run summary' : 'Upload summary',
    `Existing in sheet: ${result.existingTransactionsCount}`,
    `From file: ${result.fileTransactionsCount}`,
    `New: ${result.newTransactionsCount}`,
    dryRun
      ? `Would write: ${result.newTransactionsCount}`
      : `Written: ${result.writtenTransactionsCount}`,
    samples,
  ]
    .filter(Boolean)
    .join('\n');
}
