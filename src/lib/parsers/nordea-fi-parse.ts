import Papa from 'papaparse';
import dayjs from 'dayjs';
import { Transaction } from '../types/transaction';

/**
 * Parses Nordea Finland bank's transaction files in CSV format
 */
export async function parseNordeaFiFile(file: File): Promise<Transaction[]> {
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
          
          // Reverse to get correct chronological order (oldest first)
          const transactionCorrectOrder = transactions.slice().reverse();
          
          console.log('NordeaFI-parse results:', transactionCorrectOrder);
          resolve(transactionCorrectOrder);
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
  if (!row || row.length < 7) {
    return null;
  }

  /* Format of the rows:
  Header row
  2024/02/08;-63,00;FI49 2212 xxxx xxxx;;;Korkeasti koulutettujen;;EUR;
 
  0 - Kirjauspäivä (Booking date)
  1 - Määrä (Amount)
  2 - Maksaja (Payer)
  3 - Maksunsaaja (Recipient - usually empty)
  4 - Nimi (Name - usually empty)
  5 - Otsikko (Title/Recipient)
  6 - Viitenumero (Reference number)
  7 - Valuutta (Currency)
  */
  
  try {
    const payment = new Transaction();
    const date = dayjs(row[0]); // Use booking date (Kirjauspäivä)
    
    payment.month = date.month() + 1; // dayjs months are 0-based
    payment.year = date.format('YYYY');
    payment.date = date.format('DD/MM/YYYY');
    payment.amount = parseFloat(row[1].replace(',', '.'));
    payment.transactionType = ""; // Nordea FI doesn't have a specific transaction type field
    payment.payee = row[5]; // Use the title/recipient field
    payment.message = row[6]; // Use reference number as message
    
    payment.amountEur = payment.amount;
    
    return payment;
  } catch (error) {
    console.error('Error parsing Nordea FI transaction line:', error, row);
    return null;
  }
}
