import * as path from 'path';

import { nordeaParse } from './lib/nordea-parse';
import { importToSheets, readFromSheets } from './lib/sheets';
import { Transaction } from './lib/types';

/** 
 * How to run this?
 * 
 * main.js <filename> --read-file
 * Will parse the transaction-file and print results to console. Good for testing.
 * 
 * main.js <filename> --import
 * Will parse transaction-file and import results to Google Sheets.
 * 
*/

if (!process.argv[2] || !process.argv[3]) {
    console.log('File argument missing!')
    console.log('Run like this: npm run start -- <filename> --read-file');
    console.log('Or: npm run start -- <filename> --import');
    process.exit(9);
}

const fileName = process.argv[2];
const filePath = path.join(process.cwd(), fileName);
const runMode = process.argv[3];

run(runMode);

async function run(runMode: string) {
    switch (runMode) {
        case '--read-file': {
            console.log('Using read-file mode:');
            console.log('');
            const transactions = await nordeaParse(filePath);
            console.log(JSON.stringify(transactions));
            break;
        }
        case '--import': {
            console.log('Importing to sheets:');
            const transactions = await nordeaParse(filePath);
            await importToSheets(transactions);
            console.log('');
            break;
        }
        case '--read-sheets': {
            console.log('Reading sheets:');
            const transactions = await readFromSheets();
            console.log(transactions);
            break;
        }
        default: {
            console.log('Options are: --read-file, --read-sheets or --import');
            break;
        }
    }
}
