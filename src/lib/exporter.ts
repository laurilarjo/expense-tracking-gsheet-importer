import { Transaction} from './types';


import * as xlsx from 'xlsx';

export function exportToXlsx(transactions: Transaction[], filename: string) {
  const transactionsToWrite = mapTransactionsToRows(transactions);
  console.log('Exporting to xlsx...');
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(transactionsToWrite);
  
  // Set columns 3 & 4 to be number formatted without decimal in thousands
  for (let row = 1; row <= transactions.length + 1; row++) {
    const cellRef1 = xlsx.utils.encode_cell({r: row - 1, c: 3}); // c: 1 for column B, rows are 0-indexed
    if(ws[cellRef1]) ws[cellRef1].z = '0';
    
    const cellRef2 = xlsx.utils.encode_cell({r: row - 1, c: 4}); // c: 1 for column B, rows are 0-indexed
    if(ws[cellRef2]) ws[cellRef2].z = '0';
  }

  xlsx.utils.book_append_sheet(wb, ws, 'Transactions');
  xlsx.writeFile(wb, filename);
}

function mapTransactionsToRows(transactions: Transaction[]) {
  return transactions.map(x => {
    return [x.month, x.year, x.date, x.amount, x.amountEur, x.payee, x.transactionType, x.message];
  });
}
