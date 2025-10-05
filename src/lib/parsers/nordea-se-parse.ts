import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';
import { convertSEKToEur } from '../services/exchange-rate-service';

/**
 * Parses Nordea Sweden transaction files in XLSX format
 */
export async function parseNordeaSeFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const xlsTransactionArray = XLSX.utils.sheet_to_json(sheet);
        
        const transactions: Transaction[] = [];

        // Process each transaction
        for (const line of xlsTransactionArray) {
          const transaction = parseLine(line);
          if (transaction) {
            transactions.push(transaction);
          }
        }

        // Convert all transactions from SEK to EUR
        const conversionPromises = transactions.map(async (transaction) => {
          try {
            transaction.amountEur = await convertSEKToEur(transaction.amount, transaction.date);
          } catch (error) {
            console.error('Error converting SEK to EUR:', error);
            // If conversion fails, use the original amount
            transaction.amountEur = transaction.amount;
          }
        });

        await Promise.all(conversionPromises);

        // Sort transactions by date (oldest first)
        transactions.sort((a, b) => {
          const dateA = dayjs(a.date, 'DD/MM/YYYY').unix();
          const dateB = dayjs(b.date, 'DD/MM/YYYY').unix();
          return dateA - dateB;
        });

        console.log('Nordea-SE-parse results:', transactions);
        resolve(transactions);
      } catch (error) {
        reject(new Error(`XLSX parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parses one row to a Transaction object
 * 
 * @param line transaction details from XLSX
 * @returns Transaction object or null if invalid
 */
function parseLine(line: Record<string, unknown>): Transaction | null {
  if (!line) {
    return null;
  }

  /* Format of the XLSX columns:
  Datum - date
  Transaktion - payee
  Belopp - amount
  */

  try {
    const payment = new Transaction();
    
    // Parse the date
    const date = dayjs(line['Datum'], 'YYYY-MM-DD');
    payment.month = date.month() + 1; // dayjs months are 0-based
    payment.year = date.format('YYYY');
    payment.date = date.format('DD/MM/YYYY');
    payment.payee = line['Transaktion'] || '';
    payment.transactionType = '';
    payment.message = '';

    // Parse amount - Nordea SE uses Swedish number format (comma as decimal separator)
    const amount = parseFloat(line['Belopp'].replace(/\./g, '').replace(',', '.'));
    payment.amount = amount;

    return payment;
  } catch (error) {
    console.error('Error parsing Nordea SE transaction line:', error, line);
    return null;
  }
}
