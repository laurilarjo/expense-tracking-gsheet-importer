/**
 * Reads Nordea Finland bank's transaction files in TSV format
 */
import * as fs from 'fs';
import * as readline from 'readline';

import config from '../lib/config';
import { Transaction } from '../lib/types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
        
        let transactions: Transaction[] = [];
        let rowCounter = 0;

        let stream = fs.createReadStream(filePath);
        let rl = readline.createInterface({
            input: stream
        });

        rl.on('line', (line) => {
            rowCounter++;
             // Row 1 is header with account number, row 2 is empty, row 3 is the header row
            if (rowCounter === 1 || rowCounter === 3) {
                return;
            }

            const transaction = parseLine(line);

            if (transaction) {
                transactions.push(transaction);
            }
        }).on('close', () => {
            if (transactions.length === 0) {
                console.log('No transactions parsed!')
            }
            resolve(transactions);
        }).on('error', err => {
            reject(err);
        })

    });
}

function parseLine(line: string) {
    if (line === '') {
        return null;
    }

    const lineArr = line.split('\t');

    // 0 - Kirjauspäivä
    // 1 - Arvopäivä
    // 2 - Maksupäivä
    // 3 - Määrä
    // 4 - Saaja/Maksaja
    // 5 - Tilinumero
    // 6 - BIC
    // 7 - Tapahtuma
    // 8 - Viite
    // 9 - Maksajan viite
    // 10 - Viesti
    // 11 - Kortinnumero
    // 12 - Kuitti

    const payment = new Transaction();
    const dateParts = lineArr[2].split('.');
    payment.month = parseInt(dateParts[1]);
    payment.year = dateParts[2];
    payment.date = dateParts[0] + '/' + dateParts[1] + '/' + dateParts[2];
    payment.payee = lineArr[4];
    payment.transactionType = lineArr[7];
    payment.message = lineArr[10];
    payment.amount = parseFloat(lineArr[3].replace(',', '.'));
    payment.amountEur = payment.amount;

    return payment;
}

async function nordeaFiOldParse(filePath: string): Promise<Transaction[]> {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        if (config.LOG == 'debug') {
            console.log('Nordea-parse results:');
            console.log(transactions);
        }
        return transactions;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }

}

export {nordeaFiOldParse};
