import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';
import { convertSEKToEur } from '../services/exchange-rate-service';

/**
 * Parses Handelsbanken Sweden transaction files in XLSX format
 * Note: Handelsbanken files are actually HTML with tables, not true XLSX
 */
export async function parseHandelsbankenFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Handelsbanken files are HTML with tables, need to parse as HTML first
        const htmlContent = new TextDecoder().decode(data as ArrayBuffer);
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Find the last table (index 3) which contains the transaction data
        const tables = doc.querySelectorAll('table');
        if (tables.length < 4) {
          throw new Error('Invalid Handelsbanken file format - expected at least 4 tables');
        }
        
        // Convert the last table to a worksheet
        const sheet = XLSX.utils.table_to_sheet(tables[3], { raw: true });
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

        console.log('Handelsbanken-parse results:', transactions);
        resolve(transactions);
      } catch (error) {
        reject(new Error(`Handelsbanken parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
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

  // Skip preliminary payments (katevaraus) - they have "Prel " prefix
  if (line['Text'] && (line['Text'] as string).includes('Prel ')) {
    return null;
  }

  /* Format of the XLSX columns:
  Transaktionsdatum - date
  Text - payee
  Belopp - amount
  */

  try {
    const payment = new Transaction();
    
    // Parse the date
    const date = dayjs(line['Transaktionsdatum'], 'YYYY-MM-DD');
    payment.month = date.month() + 1; // dayjs months are 0-based
    payment.year = date.year();
    payment.date = date.format('DD/MM/YYYY');
    payment.payee = line['Text'] || '';
    payment.transactionType = '';
    payment.message = '';

    // Parse amount - Handelsbanken has some quirks with amount formatting
    let amount: number;
    if (typeof line['Belopp'] === 'string') {
      // Remove spaces and replace comma with dot for decimal
      amount = parseFloat(line['Belopp'].replace(/\s/g, '').replace(',', '.'));
    } else {
      // If it's a number, divide by 100 (Handelsbanken sometimes stores amounts in öre)
      amount = line['Belopp'] / 100;
    }
    
    payment.amount = Math.round(amount * 100) / 100;

    return payment;
  } catch (error) {
    console.error('Error parsing Handelsbanken transaction line:', error, line);
    return null;
  }
}
