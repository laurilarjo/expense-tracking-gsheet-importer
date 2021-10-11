/**
 * Reads OP Finland bank's transaction files in CSV format
 */

import * as fs from 'fs';
import * as moment from 'moment';
import * as csvParse from 'csv-parse';

import config from '../lib/config';
import { Transaction } from '../lib/types';

async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {

        let transactions: Transaction[] = [];

        fs.createReadStream(filePath)
            .pipe(csvParse({
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
    "2021-07-05";"2021-07-05"; 1700.00;"506";"TILISIIRTO";"NORDNET BANK AB";"";"";"";"Viesti: diipadaa";"20210705/5UTH01/023706"
   
    0 - Kirjauspäivä
    1 - Arvopäivä
    2 - Määrä
    3 - Laji
    4 - Selitys
    5 - Saaja/Maksaja
    6 - Saajan tilinro
    7 - Saajan pankin BIC
    8 - Viite
    9 - Viesti
    10 - Arkistointitunnus
    */
   
    let payment = new Transaction();
    const date = moment(row[1]);
    payment.month = parseInt(date.format('MM'));
    payment.year = date.format('YYYY');
    payment.date = date.format('DD/MM/YYYY');
    payment.amount = parseFloat(row[2]);
    payment.transactionType = row[4];
    payment.payee = row[5];
    payment.message = row[9];
    
    payment.amountEur = payment.amount;
    return payment;
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

export { opParse };
