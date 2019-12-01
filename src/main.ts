import * as path from 'path';

import { nordeaParse } from './lib/nordea-parse';
import { importToSheets, readFromSheets } from './lib/sheets';
import { Transaction, Context, Bank, User } from './lib/types';

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
const context = detectBankAndUser(filePath);

run(runMode);

async function run(runMode: string) {
    try {
        switch (runMode) {
            case '--read-file': {
                console.log('Using read-file mode:');
                console.log('');
                const transactions = await parseFile(filePath, context);
                console.log(`Found ${transactions.length} transactions.`);
                console.log(transactions);
                break;
            }
            case '--import': {
                console.log('Importing to sheets.');
                const transactions = await parseFile(filePath, context);
                await importToSheets(transactions, context);
                console.log('');
                break;
            }
            case '--read-sheets': {
                console.log('Reading sheets:');
                const transactions = await readFromSheets(context);
                console.log(`Found ${transactions.length} rows.`);
                console.log(transactions);
                break;
            }
            default: {
                console.log('Options are: --read-file, --read-sheets or --import');
                break;
            }
        }
    } catch (error) {
        console.log(error);
        process.exit(0);
    }
}

function detectBankAndUser(filePath: string): Context {
    // TODO: detect from the file
    return { bank: Bank.NordeaFI, user: User.Lauri };
}

async function parseFile(filePath: string, context: Context): Promise<Transaction[]> {
    if (context.bank == Bank.NordeaFI) {
        console.log('using NordeaParse');
        return await nordeaParse(filePath);
    } else {
        console.log('using defaultParse');
        return await nordeaParse(filePath);
    }
}

