import Papa from 'papaparse';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';

/**
 * Parses OP Finland bank's transaction files in CSV format
 */
export async function parseOPFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const transactions: Transaction[] = [];
    
    Papa.parse(file, {
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Skip the header row (index 0) and process data rows
          const dataRows = results.data.slice(1) as string[][];
          
          dataRows.forEach((row: string[]) => {
            const transaction = parseLine(row);
            if (transaction) {
              transactions.push(transaction);
            }
          });
          
          console.log('OP-parse results:', transactions);
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

/**
 * Parses one row to a Transaction object
 * 
 * @param row transaction details in an array
 * @returns Transaction object or null if invalid
 */
function parseLine(row: string[]): Transaction | null {
  if (!row || row.length < 11) {
    return null;
  }

  /* Format of the rows:
  Header row
  "2021-07-05";"2021-07-05"; 1700.00;"506";"TILISIIRTO";"NORDNET BANK AB";"";"";"";"Viesti: diipadaa";"20210705/5UTH01/023706"
 
  0 - Kirjauspäivä (Booking date)
  1 - Arvopäivä (Value date)
  2 - Määrä (Amount)
  3 - Laji (Type)
  4 - Selitys (Description)
  5 - Saaja/Maksaja (Recipient/Payer)
  6 - Saajan tilinro (Recipient account number)
  7 - Saajan pankin BIC (Recipient bank BIC)
  8 - Viite (Reference)
  9 - Viesti (Message)
  10 - Arkistointitunnus (Archive ID)
  */
  
  try {
    const payment = new Transaction();
    const date = dayjs(row[1]); // Use value date (Arvopäivä)
    
    payment.month = date.month() + 1; // dayjs months are 0-based
    payment.year = date.year();
    payment.date = date.format('DD/MM/YYYY');
    payment.amount = parseFloat(row[2].replace(',', '.'));
    payment.transactionType = row[4];
    payment.payee = row[5];
    payment.message = row[9];
    
    payment.amountEur = payment.amount;
    
    return payment;
  } catch (error) {
    console.error('Error parsing OP transaction line:', error, row);
    return null;
  }
}
