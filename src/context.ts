import * as fs from 'fs';
import * as path from 'path';
import * as inquirer from 'inquirer';
import * as util from 'util';

import { Context, Bank, User, RunMode, CmdLineArguments } from './lib/types';
import config from './lib/config';
import { norwegianParse } from './parsers/norwegian-parse';
import { opParse } from './parsers/op-parse';
import { nordeaFiParse } from './parsers/nordea-fi-parse';
import { nordeaSeParse } from './parsers/nordea-se-parse';
import { handelsbankenParse } from './parsers/handelsbanken-parse';
import { binanceParse } from './parsers/binance-parse';

async function getContext(argv: any): Promise<Context> {
    if (!argv.mode) {
        return await inquireContext();
    } else {
        return await detectContextFromArguments(argv);
    }
}

function validateContext(context: Context): void {
    // Check that file is provided when needed.
    if ((context.runMode == RunMode.ReadFile || context.runMode == RunMode.Import) && !context.filePath) {
        console.log('File must be provided!');
        process.exit(1);
    }
}

async function inquireImportRun(): Promise<boolean> {
    interface Answer { importRun: boolean };
    const question = [
        { type: 'confirm', name: 'importRun', message: 'Do you want to run import?', default: false }
    ];

    const answer: Answer = await inquirer.prompt(question);
    return answer.importRun;
}

async function inquireContext(): Promise<Context> {
    console.log('Here we will ask user for input');

    const files = await getFilesInDir();

    const questions = [
        { type: 'list', name: 'file', message: 'Select File', choices: files },
        { type: 'list', name: 'user', message: 'Choose User', choices: config.USERS.map(a => a.name) },
        { type: 'list', name: 'bank', message: 'Choose Bank', choices: getEnumArray(Bank) },
        { type: 'list', name: 'runMode', message: 'Select RunMode', choices: getEnumArray(RunMode) },
    ];
    const answers: CmdLineArguments = await inquirer.prompt(questions);

    const user = answers.user;
    const bank = getEnumFromString(answers.bank, Bank, 'Bank');
    const filePath = answers.file;
    const runMode = getEnumFromString(answers.runMode, RunMode, 'RunMode');
    const sheetName = getSheetName(user, bank);
    const parser = getParser(bank);

    return { 
        runMode,
        bank, 
        user,
        filePath,
        sheetName,
        parser
    } as Context;
}

/**
 * Try to collect all context parameters from command line arguments.
 * Fill context object with collected values. Validation DOES NOT happen in this fuction.
 * 
 * @param argv Command line arguments as yargs.argv
 */
async function detectContextFromArguments(argv: any): Promise<Context> {

    const runMode = getEnumFromString(argv.mode, RunMode, 'RunMode');
    console.log('detected runmode: ' + RunMode[runMode]);

    // Exceptional runmode which doesn't need any other context
    if (runMode == RunMode.LoginToSheets) {
        return {
            ...{runMode}
        } as Context;
    }

    // Bank. Verify it's found in our Enum options.
    const bank = getEnumFromString(argv.bank, Bank, 'Bank');
    console.log('detected bank: ' + Bank[bank]);

    // User
    const user = argv.user;
    console.log('detected user: ' + user);

    // Filepath. This is not validated at all.
    let filePath = null;
    if (argv.file) {
        filePath = path.join(process.cwd(), argv.file as string);
    }
    console.log('detected filepath: ' + filePath);

    // SheetName
    const sheetName = getSheetName(user, bank);
    console.log('detected sheetName: ' + sheetName);
    
    // Parser
    const parser = getParser(bank);
    console.log('detected parser: ' + (parser ? parser.name : null));

    return { 
        ...{runMode},
        ...{bank}, 
        ...{user},
        ...{filePath},
        ...{sheetName},
        ...{parser}
    } as Context;
}

function getEnumFromString<T>(value: string, enumObject: T, enumName: string): T[keyof T] {
    const result = enumObject[value as keyof typeof enumObject];
    if (result == undefined) {
        throw new Error(`Unsupported ${enumName} provided: ${value}`);
    }
    return result;
}

function getSheetName(user: string, bank: Bank): string {
    return `${user} ${Bank[bank]}`;
}

function getParser(bank: Bank): Function {
    switch (bank) {
        case Bank.NordeaFI:
            return nordeaFiParse;
        case Bank.NordeaSWE:
            return nordeaSeParse;
        case Bank.OP:
            return opParse;
        case Bank.Norwegian:
            return norwegianParse;
        case Bank.Handelsbanken:
            return handelsbankenParse;
        case Bank.Binance:
            return binanceParse;
        default:
            throw new Error('Unsupported bank provided. No parser found!');
    }
}

async function getFilesInDir(): Promise<string[]> {
    
    const readdir = util.promisify(fs.readdir);
    let result: string[] = ['Nothing'];

    try {
        const files = await readdir('./');
        for (const file of files) {
            if (file.includes('.xls') || file.includes('.xlsx') || file.includes('.txt') || file.includes('.csv')) {
                result.push(file);
            }
        };
        return result;
    } catch {
        throw new Error('Error reading current directory');
    }
}

function getEnumArray(enumObject: any): string[] {
    let enumValues: string[] = [];

    for(let value in enumObject) {
        if(typeof enumObject[value] === 'number') {
            enumValues.push(value);
        }
    }
    return enumValues;
}

export { getContext, inquireImportRun }
