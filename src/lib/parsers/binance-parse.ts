import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';

/**
 * Parses Binance credit card transaction files in XLSX format
 */
export async function parseBinanceFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
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

        xlsTransactionArray.forEach((line: Record<string, unknown>) => {
          const transaction = parseLine(line);
          if (transaction) {
            transactions.push(transaction);
          }
        });

        // Sort transactions by date (oldest first)
        transactions.sort((a, b) => {
          const dateA = dayjs(a.date, 'DD/MM/YYYY').unix();
          const dateB = dayjs(b.date, 'DD/MM/YYYY').unix();
          return dateA - dateB;
        });

        console.log('Binance-parse results:', transactions);
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
  Timestamp -> date
  Description -> payee
  Paid OUT (EUR) -> amount
  */

  // Skip Katevaraus transactions as they will be updated to "Osto" in upcoming exports
  if (line['Type'] === 'Katevaraus') {
    return null;
  }

  try {
    const payment = new Transaction();
    
    // Parse the timestamp
    const timestamp = line['Timestamp'];
    if (!timestamp) {
      return null;
    }
    
    // Create dayjs date object from timestamp
    const transactionDate = dayjs(timestamp);
    
    payment.month = transactionDate.month() + 1; // dayjs months are 0-based
    payment.year = transactionDate.format('YYYY');
    payment.date = transactionDate.format('DD/MM/YYYY');
    payment.payee = line['Description'] || '';
    payment.transactionType = '';
    payment.message = '';
    
    // Parse amount and make it negative (it's not marked as negative in the xlsx)
    const paidOut = parseFloat(line['Paid OUT (EUR)']) || 0;
    payment.amount = 0 - paidOut;
    payment.amountEur = payment.amount;

    return payment;
  } catch (error) {
    console.error('Error parsing Binance transaction line:', error, line);
    return null;
  }
}
