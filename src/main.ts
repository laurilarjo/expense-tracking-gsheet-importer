import * as path from 'path';
import {argv} from 'yargs';

import { nordeaParse } from './lib/nordea-parse';
import {detectBankAndUserFromFile} from './detect-bank';
import { importToSheets, readFromSheets } from './lib/sheets';
import { Transaction, Context, Bank, User } from './lib/types';

/** 
 * How to run this?
 * 
 * "npm run start" and you get instructions.
 * 
*/

const RunMode = {
    ReadSheets: 'read-sheets',
    ReadFile: 'read-file',
    Import: 'import'
}

validateArguments();
run();

function printInstructions() {
    console.log(`
Usage example:
    node built/main.js --mode=read-file --file=./sample-files/Tapahtumat_nordea_sample.txt

Allowed modes are: ${JSON.stringify(Object.values(RunMode))});

With NPM:
    npm run read-sheets
    npm run read-file --file=./sample-files/Tapahtumat_nordea_sample.txt
    npm run import --file=./sample-files/Tapahtumat_nordea_sample.txt
    `);
}

function validateArguments(): void {
    // Check for allowed modes
    if (!argv.mode || !Object.values(RunMode).includes(argv.mode as string)) {
        console.log('Correct mode must be provided!');
        printInstructions()
        process.exit(1);
    }

    // Check that file is provided when needed.
    if ((argv.mode == 'read-file' || argv.mode == 'import') && !argv.file) {
        console.log('File must be provided!');
        printInstructions();
        process.exit(1);
    }
}

async function detectContext(argv: any): Promise<Context> {
    let filePath = '';
    const runMode = argv.mode as string;
    if ((runMode == 'read-file' || runMode == 'import')) {
        filePath = path.join(process.cwd(), argv.file as string);
    }
    let context = {
        ...{filePath}, 
        ...{runMode} 
    } as Context

    context = await detectBankAndUserFromFile(filePath, context);
    console.log('context detected as: ' + context.bank);
    
    return context;
}

async function run() {
    const context = await detectContext(argv);

    try {
        switch (context.runMode) {
            case 'read-file': {
                console.log('Using read-file mode:');
                console.log('');
                const transactions = await parseFile(context.filePath, context);
                console.log(`Found ${transactions.length} transactions.`);
                console.log(transactions);
                break;
            }
            case 'import': {
                console.log('Importing to sheets.');
                const transactions = await parseFile(context.filePath, context);
                await importToSheets(transactions, context);
                console.log('');
                break;
            }
            case 'read-sheets': {
                console.log('Reading sheets:');
                const transactions = await readFromSheets(context);
                console.log(`Found ${transactions.length} rows.`);
                console.log(transactions);
                break;
            }
            default: {
                console.log('Unallowed RunMode chosen!');
                break;
            }
        }
    } catch (error) {
        console.log(error);
        process.exit(0);
    }
}

async function parseFile(filePath: string, context: Context): Promise<Transaction[]> {
    if (context.bank == Bank.NordeaFI) {
        console.log('using NordeaParse');
        return await nordeaParse(filePath);
    } else if (context.bank == Bank.OP) {
        console.log('using OpParse');
        return await nordeaParse(filePath);
    } else {
        console.log('using defaultParse');
        return await nordeaParse(filePath);
    }
}

