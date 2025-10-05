import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';

/**
 * Parses Norwegian Bank credit card transaction files in XLSX format
 */
export async function parseNorwegianFile(file: File): Promise<Transaction[]> {
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

        console.log('Norwegian-parse results:', transactions);
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
  TransactionDate -> date
  Text -> payee
  Type -> transactionType
  Merchant Category -> message
  Amount -> amount
  */

  // Skip Katevaraus transactions as they will be updated to "Osto" in upcoming exports
  if (line['Type'] === 'Katevaraus') {
    return null;
  }

  try {
    const payment = new Transaction();
    
    // Parse the date from Excel date format
    const excelDate = line['TransactionDate'];
    if (!excelDate) {
      return null;
    }
    
    // Convert Excel date to JavaScript Date
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (!date) {
      return null;
    }
    
    // Create dayjs date object
    const transactionDate = dayjs(`${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`);
    
    payment.month = transactionDate.month() + 1; // dayjs months are 0-based
    payment.year = transactionDate.format('YYYY');
    payment.date = transactionDate.format('DD/MM/YYYY');
    payment.payee = line['Text'] || '';
    payment.transactionType = line['Type'] || '';
    payment.message = line['Merchant Category'] || '';
    payment.amount = parseFloat(line['Amount']) || 0;
    payment.amountEur = payment.amount;

    return payment;
  } catch (error) {
    console.error('Error parsing Norwegian transaction line:', error, line);
    return null;
  }
}
