/**
 * Reads Nordea Finland bank's transaction files in TSV format and 
 * outputs into Google Spreadsheet format.
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { parseLine } from './nordea-parse-line';
import { Payment } from './types';


async function nordeaParse(filePath: string): Promise<Payment[]> {
    const lineReader = readline.createInterface({
    input: fs.createReadStream(filePath)
    });

    let rowCounter = 0;
    let payments: Payment[] = [];

    lineReader.on('line', (line) => {
        rowCounter++;

        // Row 1 is header with account number, row 2 is empty, row 3 is the header row
        if (rowCounter === 1 || rowCounter === 3) {
            return;
        }

        const payment = parseLine(line);

        if (payment) {
            payments.push(payment);
        }
    });

    lineReader.on('close', () => {
        if (payments.length === 0) {
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

        payments.forEach((payment) => {
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
    });

    return payments;

}

export {nordeaParse};