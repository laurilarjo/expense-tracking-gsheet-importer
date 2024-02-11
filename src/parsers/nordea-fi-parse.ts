/**
 * Reads Nordea Finland bank's transaction files in CSV format (new bank service)
 */

import * as fs from 'fs';
import * as moment from 'moment';
import { parse }  from 'csv-parse';

import config from '../lib/config';
import { Transaction } from '../lib/types';

async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {

        let transactions: Transaction[] = [];

        fs.createReadStream(filePath)
            .pipe(parse({
                delimiter: ';', 
                bom: true,
                from_line: 2
            }))
            .on('data', function(line: any) {
                const transaction = parseLine(line);
                console.log(JSON.stringify(transaction));

                if (transaction) {
                    transactions.push(transaction);
                }
            })
            .on('end', function() {
                if (transactions.length === 0) {
                    console.log('No transactions parsed!')
                }
                resolve(transactions);
            })
            .on('error', function(err) {
                reject(err);
            });

    });
}

/**
 * Parses one row to a Transaction object
 * 
 * @param row transaction details in an array
 * @returns 
 */
function parseLine(row: string[]): Transaction | null {

    /* Format of the rows:
    Header row
    2024/02/08;-63,00;FI49 2212 xxxx xxxx;;;Korkeasti koulutettujen;;EUR;
    
    0 - Kirjauspäivä
    1 - Määrä
    2 - Maksaja
    3 - Maksunsaaja (usually empty)
    4 - Nimi (usually empty)
    5 - Otsikko (maksunsaaja)
    6 - Viitenumero
    7 - Valuutta
    
    */
   
    let payment = new Transaction();
    const date = moment(row[0]);
    payment.month = parseInt(date.format('MM'));
    payment.year = date.format('YYYY');
    payment.date = date.format('DD/MM/YYYY');
    payment.amount = parseFloat(row[1].replace(',', '.'));
    payment.transactionType = "";
    payment.payee = row[5];
    payment.message = row[6];
    
    payment.amountEur = payment.amount;
    return payment;
}

async function nordeaFiParse(filePath: string): Promise<Transaction[]> {

    try {
        const transactions = await readTransactionsFromFile(filePath);
        const transactionCorrectOrder = transactions.slice().reverse();

        if (config.LOG == 'debug') {
            console.log('NordeaFI-parse results:');
            console.log(transactionCorrectOrder);
        }
        return transactionCorrectOrder;
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }
}

export { nordeaFiParse };
