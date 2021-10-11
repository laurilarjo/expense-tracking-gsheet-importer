/**
 * Reads Bank Norwegian Finland credit card transaction files in XLSX format
 */
import * as xlsx from 'xlsx';

import config from '../lib/config';
import { Transaction } from '../lib/types';


const readTransactionsFromFile = async (filePath: string): Promise<Transaction[]> => {
    
    console.log(filePath);
    
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const xlsTransactionArray = xlsx.utils.sheet_to_json(sheet);
    const transactions: Transaction[] = [];

    xlsTransactionArray.forEach((line: any) => {
        const transaction = parseLine(line);
        if (transaction) {
            transactions.push(transaction);
        }
    });

    return transactions as Transaction[];
}

const parseLine = (line: any): Transaction | null => {
    if (!line) {
        return null;
    }

    // TransactionDate -> date
    // Text -> payee
    // Type -> transactionType
    // Merchant Category -> message
    // Amount -> amount

    // Skip, because these will be updated to "Osto" in upcoming exports
    if (line['Type'] == 'Katevaraus') {
        return null;
    }

    const payment = new Transaction();
    const date = xlsx.SSF.parse_date_code(line['TransactionDate']);
    payment.month = date.m;
    payment.year = `${date.y}`;
    payment.date = `${date.d}/${date.m}/${date.y}`;
    payment.payee = line['Text'];
    payment.transactionType = line['Type'];
    payment.message = line['Merchant Category'] || '';
    payment.amount = line['Amount'];
    payment.amountEur = payment.amount;

    return payment;
}

export const norwegianParse = async (filePath: string): Promise<Transaction[]> => {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        if (config.LOG == 'debug') {
            console.log('Norwegian-parse results:');
            console.log(transactions);
        }
        return transactions;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }

}
