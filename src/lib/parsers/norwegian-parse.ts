import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';
import { log } from '../utils/logger';

/**
 * Parses Norwegian Bank credit card transaction files in XLSX format
 */
export async function parseNorwegianFile(file: File): Promise<Transaction[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const xlsTransactionArray = XLSX.utils.sheet_to_json(sheet);

    const transactions: Transaction[] = [];

    xlsTransactionArray.forEach((line: Record<string, unknown>) => {
      const transaction = parseLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    });

    log.debug('Norwegian-parse results:', transactions);
    return transactions;
  } catch (error) {
    throw new Error(`XLSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses one row to a Transaction object
 */
function parseLine(line: Record<string, unknown>): Transaction | null {
  if (!line) {
    return null;
  }

  // Skip Katevaraus transactions as they will be updated to "Osto" in upcoming exports
  if (line['Type'] === 'Katevaraus') {
    return null;
  }

  try {
    const payment = new Transaction();

    const excelDate = line['TransactionDate'];
    if (!excelDate) {
      return null;
    }

    const date = XLSX.SSF.parse_date_code(excelDate as number);
    if (!date) {
      return null;
    }

    const transactionDate = dayjs(
      `${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`
    );

    payment.month = transactionDate.month() + 1;
    payment.year = transactionDate.year();
    payment.date = transactionDate.format('DD/MM/YYYY');
    payment.payee = (line['Text'] as string) || '';
    payment.transactionType = (line['Type'] as string) || '';
    payment.message = (line['Merchant Category'] as string) || '';
    payment.amount = parseFloat(String(line['Amount'])) || 0;
    payment.amountEur = payment.amount;

    return payment;
  } catch (error) {
    console.error('Error parsing Norwegian transaction line:', error, line);
    return null;
  }
}
