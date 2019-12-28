/**
 * Reads Bank Norwegian Finland credit card transaction files in XLSX format
 */
import * as xlsx from 'xlsx';

import config from './config';
import { Transaction } from './types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    
    console.log(filePath);
    
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['transactions'];
    const transactionArray = xlsx.utils.sheet_to_json(sheet);
    const transactions: Transaction[] = [];

    transactionArray.forEach((line: any) => {
        const transaction = parseLine(line);
        if (transaction) {
            transactions.push(transaction);
        }
    });

    return transactions as Transaction[];
}

function parseLine(line: any): Transaction | null {
    if (!line) {
        return null;
    }

    // TransactionDate - date
    // Text - payee
    // Type - transactionType
    // Merchant Category - message
    // Amount - amount

    let payment = {} as Transaction;    
    const date = xlsx.SSF.parse_date_code(line['TransactionDate']);
    payment.month = date.m;
    payment.year = `${date.y}`;
    payment.date = `${date.d}/${date.m}/${date.y}`;
    payment.payee = line['Text'];
    payment.transactionType = line['Type'];
    payment.message = line['Merchant Category'];
    payment.amount = line['Amount'];

    return new Transaction(payment);
}

async function norwegianParse(filePath: string): Promise<Transaction[]> {

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

export {norwegianParse};
