/**
 * Reads OP Finland bank's transaction files in CSV format
 */
import * as fs from 'fs';
import * as readline from 'readline';

import config from './config';
import { Transaction } from './types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
        
        let transactions: Transaction[] = [];
        let rowCounter = 0;

        let stream = fs.createReadStream(filePath, {encoding: 'latin1'});
        let rl = readline.createInterface({
            input: stream
        });

        rl.on('line', (line) => {
            rowCounter++;
             // Row 1 is header row
            if (rowCounter === 1) {
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

    const lineArr = line.split(';');
    
    // Header row
    // 15.01.2019;15.01.2019;-5,65;"103";PALVELUMAKSU;"OSUUSPANKKI";;"0001234567";TILIASIOINNIN PALVELUMAKSUT AJALTA 1.11-30.11.2018   ;20190115/5 AL  /001031

    // 0 - Kirjauspäivä
    // 1 - Arvopäivä
    // 2 - Määrä
    // 3 - Laji
    // 4 - Selitys
    // 5 - Saaja/Maksaja
    // 6 - Saajan tilinro
    // 7 - Viite
    // 8 - Viesti
    // 9 - Arkistointitunnus
    

    let payment = {} as Transaction;
    const dateParts = lineArr[1].split('.');
    payment.month = parseInt(dateParts[1]);
    payment.year = dateParts[2];
    payment.date = dateParts[0] + '/' + dateParts[1] + '/' + dateParts[2];
    payment.transactionType = lineArr[4];
    payment.payee = lineArr[5].replace(/"/g, '');
    payment.message = lineArr[8];
    payment.amount = parseFloat(lineArr[2].replace(',', '.'));

    return new Transaction(payment);
}

async function opParse(filePath: string): Promise<Transaction[]> {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        if (config.LOG == 'debug') {
            console.log('OP-parse results:');
            console.log(transactions);
        }
        return transactions;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }

}

export {opParse};
