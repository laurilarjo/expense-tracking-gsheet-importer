/**
 * Reads Bank Norwegian Finland credit card transaction files in XLSX format
 */
import * as xlsx from 'xlsx';
import * as moment from 'moment';

import config from '../lib/config';
import { convertSEKToEur } from '../lib/utils';
import { Transaction } from '../lib/types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    
    console.log(filePath);
    
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const xlsTransactionArray = xlsx.utils.sheet_to_json(sheet);
    const transactions: Transaction[] = [];

    for (const line of xlsTransactionArray) {
        const transaction = parseLine(line);
        if (transaction) {
            transaction.amountEur = await convertSEKToEur(transaction.amount);
            transactions.push(transaction);
        }
    };

    // I want oldest transactions to top
    transactions.sort((a, b) => {
        return (moment(a.date, 'D/M/YYYY') as any) - (moment(b.date, 'D/M/YYYY') as any);
    })

    return transactions as Transaction[];
}

function parseLine(line: any): Transaction | null {
    if (!line) {
        return null;
    }

    // Datum - date
    // Transaktion - payee
    // Belopp - amount

    let payment = {} as Transaction;
    const date = moment(line['Datum'], 'YYYY-MM-DD');
    payment.month = date.month();
    payment.year = `${date.year()}`;
    payment.date = `${date.day()}/${date.month()}/${date.year()}`;
    payment.payee = `${line['Transaktion']}`;
    payment.transactionType = '';
    payment.message = '';
    payment.amount = parseFloat(line['Belopp'].replace('.', '').replace(',', '.'));

    return new Transaction(payment);
}

async function nordeaSeParse(filePath: string): Promise<Transaction[]> {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        if (config.LOG == 'debug') {
            console.log('Nordea-SE-parse results:');
            console.log(transactions);
        }
        return transactions;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }

}

export { nordeaSeParse };
