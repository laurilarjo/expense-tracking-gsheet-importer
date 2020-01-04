/**
 * Reads Bank Norwegian Finland credit card transaction files in XLSX format
 */
import * as xlsx from 'xlsx';
import * as moment from 'moment';
import { JSDOM } from 'jsdom';

import config from '../lib/config';
import { convertSEKToEur } from '../lib/utils';
import { Transaction } from '../lib/types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    
    console.log(filePath);
    
    const dom = await JSDOM.fromFile(filePath);
    // The file is actually HTML with 4 tables. Interesting data is on the last.
    // Need to read it as raw, otherwise xlsx tries to incorrectly interpret some cells as dates.
    const sheet = xlsx.utils.table_to_sheet(dom.window.document.querySelectorAll("table")[3], {raw: true});
    const xlsTransactionArray = xlsx.utils.sheet_to_json(sheet);

    const transactions: Transaction[] = [];

    for (const line of xlsTransactionArray) {
        const transaction = parseLine(line);
        if (transaction) {
            transaction.amountEur = await convertSEKToEur(transaction.amount, transaction.date);
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

    // Transaktionsdatum - date
    // Text - payee
    // Belopp - amount

    let payment = {} as Transaction;    
    const date = moment(line['Transaktionsdatum'], 'YYYY-MM-DD');
    payment.month = parseInt(date.format('MM'));
    payment.year = date.format('YYYY');
    payment.date = date.format('DD/MM/YYYY');
    payment.payee = `${line['Text']}`;
    payment.transactionType = '';
    payment.message = '';

    // Voi vittu sentään Handelsbanken
    if (typeof(line['Belopp']) === 'string') {
        payment.amount = parseFloat(line['Belopp'].replace(' ', '').replace(',', '.'));
    } else {
        payment.amount = line['Belopp'] / 100;
    }
    payment.amount = Math.round(payment.amount * 100) / 100;

    return new Transaction(payment);
}

async function handelsbankenParse(filePath: string): Promise<Transaction[]> {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        if (config.LOG == 'debug') {
            console.log('Handelsbanken-parse results:');
            console.log(transactions);
        }
        return transactions;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }

}

export { handelsbankenParse };
