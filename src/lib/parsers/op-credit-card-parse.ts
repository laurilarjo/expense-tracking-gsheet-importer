import { Transaction } from '../types/transaction';

/**
 * Parses OP Credit Card statement files in Finvoice XML format.
 * Extracts transaction lines from SpecificationDetails > SpecificationFreeText
 * that match "DD.MM. Osto MERCHANT DESCRIPTION AMOUNT".
 */
export async function parseOPCreditCardFile(file: File): Promise<Transaction[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + (parseError.textContent || 'Parse error'));
  }

  const year = getStatementYear(doc);
  const transactions: Transaction[] = [];

  const freeTextNodes = doc.querySelectorAll('SpecificationFreeText');
  freeTextNodes.forEach((node) => {
    const line = (node.textContent || '').trim();
    const tx = parseTransactionLine(line, year);
    if (tx) transactions.push(tx);
  });

  console.log('OP Credit Card parse results:', transactions);
  return transactions;
}

function getStatementYear(doc: Document): number {
  const endDate = doc.querySelector('InvoicingPeriodEndDate, EndDate');
  const value = (endDate?.textContent || '').trim();
  if (!value || value.length < 4) return new Date().getFullYear();
  const year = parseInt(value.slice(0, 4), 10);
  return isNaN(year) ? new Date().getFullYear() : year;
}

/**
 * Matches lines like:
 * "17.12. Osto ALEPA MAUNULA HELSINKI                                        305,33"
 * Amount may use space as thousands separator (e.g. "1 950,27").
 */
const TRANSACTION_LINE_REGEX = /^(\d{1,2})\.(\d{1,2})\.\s+Osto\s+(.+)$/;

function parseTransactionLine(line: string, year: number): Transaction | null {
  const match = line.match(TRANSACTION_LINE_REGEX);
  if (!match) return null;

  const [, dayStr, monthStr, rest] = match;
  const day = parseInt(dayStr!, 10);
  const month = parseInt(monthStr!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const amountMatch = rest.match(/\s+([\d\s]+,\d{2})\s*$/);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(/\s/g, '').replace(',', '.');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const payee = rest.slice(0, amountMatch.index).trim();
  if (!payee) return null;

  const date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  const payment = new Transaction();
  payment.month = month;
  payment.year = year;
  payment.date = date;
  payment.amount = amount;
  payment.amountEur = amount;
  payment.transactionType = 'Osto';
  payment.payee = payee;
  payment.message = '';

  return payment;
}
