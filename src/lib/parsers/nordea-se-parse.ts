import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';
import { convertSEKToEur } from '../services/exchange-rate-service';

/**
 * Parses Nordea Sweden transaction files in XLSX format
 */
export async function parseNordeaSeFile(file: File): Promise<Transaction[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const xlsTransactionArray = XLSX.utils.sheet_to_json(sheet);

    const transactions: Transaction[] = [];

    for (const line of xlsTransactionArray) {
      const transaction = parseLine(line as Record<string, unknown>);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    const conversionPromises = transactions.map(async (transaction) => {
      try {
        transaction.amountEur = await convertSEKToEur(transaction.amount, transaction.date);
      } catch (error) {
        console.error('Error converting SEK to EUR:', error);
        transaction.amountEur = transaction.amount;
      }
    });

    await Promise.all(conversionPromises);

    transactions.sort((a, b) => {
      const dateA = dayjs(a.date, 'DD/MM/YYYY').unix();
      const dateB = dayjs(b.date, 'DD/MM/YYYY').unix();
      return dateA - dateB;
    });

    return transactions;
  } catch (error) {
    throw new Error(`XLSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseLine(line: Record<string, unknown>): Transaction | null {
  if (!line) {
    return null;
  }

  try {
    const payment = new Transaction();

    const date = dayjs(line['Datum'] as string, 'YYYY-MM-DD');
    payment.month = date.month() + 1;
    payment.year = date.year();
    payment.date = date.format('DD/MM/YYYY');
    payment.payee = (line['Transaktion'] as string) || '';
    payment.transactionType = '';
    payment.message = '';

    const amount = parseFloat(String(line['Belopp']).replace(/\./g, '').replace(',', '.'));
    payment.amount = amount;

    return payment;
  } catch (error) {
    console.error('Error parsing Nordea SE transaction line:', error, line);
    return null;
  }
}
