import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';
import { convertSEKToEur } from '../services/exchange-rate-service';
import { createDOMParser } from '../utils/dom-parser';
import { log } from '../utils/logger';

/**
 * Parses Handelsbanken Sweden transaction files.
 * Note: Handelsbanken exports are HTML with tables, not true XLSX.
 */
export async function parseHandelsbankenFile(file: File): Promise<Transaction[]> {
  try {
    const data = await file.arrayBuffer();
    const htmlContent = new TextDecoder().decode(data);
    const parser = await createDOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const tables = doc.querySelectorAll('table');
    if (tables.length < 4) {
      throw new Error('Invalid Handelsbanken file format - expected at least 4 tables');
    }

    const sheet = XLSX.utils.table_to_sheet(tables[3] as unknown as HTMLTableElement, { raw: true });
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

    log.debug('Handelsbanken-parse results:', transactions);
    return transactions;
  } catch (error) {
    throw new Error(
      `Handelsbanken parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function parseLine(line: Record<string, unknown>): Transaction | null {
  if (!line) {
    return null;
  }

  if (line['Text'] && String(line['Text']).includes('Prel ')) {
    return null;
  }

  try {
    const payment = new Transaction();

    const date = dayjs(line['Transaktionsdatum'] as string, 'YYYY-MM-DD');
    payment.month = date.month() + 1;
    payment.year = date.year();
    payment.date = date.format('DD/MM/YYYY');
    payment.payee = (line['Text'] as string) || '';
    payment.transactionType = '';
    payment.message = '';

    let amount: number;
    if (typeof line['Belopp'] === 'string') {
      amount = parseFloat(line['Belopp'].replace(/\s/g, '').replace(',', '.'));
    } else {
      amount = (line['Belopp'] as number) / 100;
    }

    payment.amount = Math.round(amount * 100) / 100;

    return payment;
  } catch (error) {
    console.error('Error parsing Handelsbanken transaction line:', error, line);
    return null;
  }
}
