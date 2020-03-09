
import {argv} from 'yargs';

import { getContext, inquireImportRun } from './context';
import { importToSheets, readFromSheets, compareToSheets } from './lib/sheets';
import { Transaction, Context, Bank, User, RunMode } from './lib/types';

/** 
 * How to run this?
 * 
 * "npm run start" and you get instructions.
 * 
*/

try {
    run();
} catch (error) {
    console.log(error);
    process.exit(0);
}

function printInstructions() {
    console.log(`
Usage example:
    node built/main.js --mode=<runMode> --file=<filepath> --bank=<bank> --user=<user>

Allowed modes are: ${JSON.stringify(Object.values(RunMode))});
Allowed banks are: ...
Allowed users are: ...

With NPM:
    npm run read-sheets --bank=Nordea --user=Lauri
    npm run read-file --file=./sample-files/Tapahtumat_nordea_sample.txt --bank=Nordea --user=Lauri
    npm run import --file=./sample-files/Tapahtumat_nordea_sample.txt --bank=Nordea --user=Lauri
    `);
}



async function run() {
    let context = {} as Context;
    try {
        context = await getContext(argv);
    } catch (error) {
        printInstructions();
        process.exit(0);
    }
    console.log('Detected context:');
    console.log(context);
    console.log('Bank detected as: ' + Bank[context.bank]);
    console.log('User detected as: ' + User[context.user]);
    console.log('Using parser: ' + (context.parser ? context.parser.name : null));

    try {
        switch (context.runMode) {
            case RunMode.ReadFile: {
                console.log('Using read-file mode...');
                console.log('');
                const transactions = await parseFile(context);
                console.log(`Found ${transactions.length} transactions.`);
                //console.log(transactions);
                break;
            }
            case RunMode.Import: {
                await makeImport(context);
                break;
            }
            case RunMode.ReadSheets: {
                console.log('Reading sheets...');
                const transactions = await readFromSheets(context);
                console.log(`Found ${transactions.length} rows.`);
                console.log(transactions);
                break;
            }
            case RunMode.DryRun: {
                console.log('Doing a dry run...');
                const transactions = await parseFile(context);
                await compareToSheets(transactions, context);
                console.log('');
                const importRun = await inquireImportRun();
                if (importRun) {
                    context.runMode = RunMode.Import;
                    makeImport(context);
                }
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

async function makeImport(context: Context) {
    console.log('Importing to sheets...');
    const transactions = await parseFile(context);
    await importToSheets(transactions, context);
    console.log('');
}

async function parseFile(context: Context): Promise<Transaction[]> {
        return await context.parser(context.filePath);
}

