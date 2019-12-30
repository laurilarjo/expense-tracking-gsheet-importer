/**
 * Reads Bank Norwegian Finland credit card transaction files in XLSX format
 */
import * as xlsx from 'xlsx';
import util = require('util');
import { JSDOM } from 'jsdom';
import * as getRates from 'ecb-fx-rates';
//import  { ExchangeRate, Currencies, ExchangeResponse } from 'exchange-rates-as-promised';

import config from '../lib/config';
import { Transaction } from '../lib/types';


async function readTransactionsFromFile(filePath: string): Promise<Transaction[]> {
    
    console.log(filePath);


    const exchangeRate = await getRates({currency: 'SEK'});
    console.log('rate: ' + exchangeRate);

    /*
    This exchangeRate library is not well done as NPM package, but is otherwise promising. 
    I'm waiting for feedback on the issue: https://github.com/ToeFungi/exchange-rates-as-promised/issues/2

    const exchangeRate = new ExchangeRate();
    exchangeRate.setBaseCurrency(Currencies.EUR);
    exchangeRate.setCurrencies([Currencies.SEK]);
    exchangeRate.setDate(new Date());

    exchangeRate.getRates().then((response: ExchangeResponse) => console.log({
        base: response.base,
        date: response.date,
        rates: response.rates
    }))
    */

    
    const dom = await JSDOM.fromFile(filePath);
    let workbook = xlsx.utils.book_new();
    const ws1 = xlsx.utils.table_to_sheet(dom.window.document.querySelectorAll("table")[3]);
    const xlsTransactionArray = xlsx.utils.sheet_to_json(ws1);
    //console.log(xlsTransactionArray);

    const transactions: Transaction[] = [];

    xlsTransactionArray.forEach((line: any) => {
        const transaction = parseLine(line);
        if (transaction) {
            // TODO: Change this after adding the SEK & EUR columns
            transaction.amount = Math.round((transaction.amount / exchangeRate) * 100) / 100;
            transactions.push(transaction);
        }
    });

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
    const date = xlsx.SSF.parse_date_code(line['Transaktionsdatum']);
    payment.month = date.m;
    payment.year = `${date.y}`;
    payment.date = `${date.d}/${date.m}/${date.y}`;
    payment.payee = line['Text'];
    payment.transactionType = '';
    payment.message = '';
    payment.amount = line['Belopp']/100;

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
