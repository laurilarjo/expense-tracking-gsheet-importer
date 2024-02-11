import { Transaction} from './types';


import * as xlsx from 'xlsx';

export function exportToXlsx(transactions: Transaction[], filename: string) {
  const transactionsToWrite = mapTransactionsToRows(transactions);
  console.log('Exporting to xlsx...');
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(transactionsToWrite);
  xlsx.utils.book_append_sheet(wb, ws, 'Transactions');
  xlsx.writeFile(wb, filename);
}

function mapTransactionsToRows(transactions: Transaction[]) {
  return transactions.map(x => {
    return [x.month, x.year, x.date, x.amount, x.amountEur, x.payee, x.transactionType, x.message];
  });
}
