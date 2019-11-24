import * as path from 'path';

import { nordeaParse } from './lib/nordea-parse';

/** 
 * How to run this?
 * 
 * main.js <filename> --read-only
 * Will parse the transaction-file and print results to console. Good for testing.
 * 
 * main.js <filename> --import
 * Will parse transaction-file and import results to Google Sheets.
 * 
*/

if (!process.argv[2] || !process.argv[3]) {
    console.log('File argument missing!')
    console.log('Run like this: npm run start -- <filename> --read-only');
    console.log('Or: npm run start -- <filename> --import');
    process.exit(9);
}

const fileName = process.argv[2];
const filePath = path.join(process.cwd(), fileName);

if (process.argv[3] === '--read-only') {
    console.log('Using read-only mode:');
    console.log('');
    readOnly();
} else if (process.argv[3] === '--import') {
    console.log('Import not implemented');
    console.log('');
} else {
    console.log('Options are: --read-only or --import');
}

async function readOnly() {
    const transactions = await nordeaParse(filePath);
    console.log(JSON.stringify(transactions));
}