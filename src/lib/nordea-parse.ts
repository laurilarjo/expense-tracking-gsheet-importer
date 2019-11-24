/**
 * Reads Nordea Finland bank's transaction files in TSV format and 
 * outputs into Google Spreadsheet format.
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { Transaction } from './types';


async function nordeaParse(filePath: string): Promise<Transaction[]> {
    const lr = readline.createInterface({
        input: fs.createReadStream(filePath)
    });

    let rowCounter = 0;
    let transactions: Transaction[] = [];

    lr.on('line', (line) => {
        rowCounter++;

        // Row 1 is header with account number, row 2 is empty, row 3 is the header row
        if (rowCounter === 1 || rowCounter === 3) {
            return;
        }

        const transaction = parseLine(line);

        if (transaction) {
            transactions.push(transaction);
        }
    });

    lr.on('close', () => {
        if (transactions.length === 0) {
            console.log('No payments parsed!')
            process.exit(1);
        }

        const outputName = 'nordea-ynab-' + Date.now() + '.csv';

        const output = fs.createWriteStream(outputName);

        output.on('error', (err) => {
            console.log(err);
        });

        output.write('Month;Year;Date;Payee;TransactionType;Message;Outflow;Inflow' + '\n')
        console.log('Month;Year;Date;Payee;TransactionType;Message;Outflow;Inflow')

        transactions.forEach((payment) => {
            const paymentArr = [
                payment.month,
                payment.year,
                payment.date,
                payment.payee,
                payment.transactionType,
                payment.message,
                payment.outflow,
                payment.inflow
            ];

            output.write(paymentArr.join(';') + '\n');
            console.log(paymentArr.join(';'));
        });

        output.end();
        console.log(JSON.stringify(transactions));
        return transactions;
    });
    return transactions;

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

    const dateParts = lineArr[2].split('.');
    let payment = new Transaction();
    payment.month = parseInt(dateParts[1]);
    payment.year = parseInt(dateParts[2]);
    payment.date = dateParts[0] + '/' + dateParts[1] + '/' + dateParts[2];
    payment.payee = lineArr[4];
    payment.transactionType = lineArr[7];
    payment.message = lineArr[10];

    let amount = parseFloat(lineArr[3].replace(',', '.'));
    
    if (amount > 0) {
        payment.inflow = amount;
    } else {
        payment.outflow = -1 * amount;
    }

    return payment;
}

export {nordeaParse};