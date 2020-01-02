import * as path from 'path';

import { Context, Bank, User, RunMode } from './lib/types';
import config from './lib/config';
import { norwegianParse } from './parsers/norwegian-parse';
import { opParse } from './parsers/op-parse';
import { nordeaFiParse } from './parsers/nordea-fi-parse';
import { nordeaSeParse } from './parsers/nordea-se-parse';
import { handelsbankenParse } from './parsers/handelsbanken-parse';


async function getContext(argv: any): Promise<Context> {
    const context = await detectContextFromArguments(argv);
    return context;
}

/**
 * Try to collect all context parameters from command line arguments.
 * Fill context object with collected values. Validation DOES NOT happen in this fuction.
 * 
 * @param argv Command line arguments as yargs.argv
 */
async function detectContextFromArguments(argv: any): Promise<Context> {

    const runMode = RunMode[argv.mode as keyof typeof RunMode];
    if (runMode == undefined) {
        throw new Error('Incorrect RunMode provided!');
    }
    console.log('detected runmode: ' + RunMode[runMode]);

    // Bank. Verify it's found in our Enum options.
    const bank : Bank = Bank[argv.bank as keyof typeof Bank];
    if (bank == undefined) {
        throw new Error('Unsupported Bank provided: ' + argv.bank)
    }
    console.log('detected bank: ' + Bank[bank]);

    // User. Verify it's found in our Enum options.
    const user : User = User[argv.user as keyof typeof User];
    if (user == undefined) {
        throw new Error('Unsupported User provided: ' + argv.user)
    }
    console.log('detected user: ' + User[user]);

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

function getSheetName(user: User, bank: Bank): string {
    if (user == User.Lauri && bank == Bank.NordeaFI) {
        return config.SHEET_NAME_NORDEA_LAURI;
    } else if (user == User.Lauri && bank == Bank.OP) {
        return config.SHEET_NAME_OP_LAURI;
    } else if (user == User.Lauri && bank == Bank.Norwegian) {
        return config.SHEET_NAME_NORWEGIAN_LAURI;
    } else if (user == User.Lauri && bank == Bank.Handelsbanken) {
        return config.SHEET_NAME_HANDELSBANKEN_LAURI;
    } else if (user == User.Becky && bank == Bank.NordeaSWE) {
        return config.SHEET_NAME_NORDEASE_BECKY;
    } else {
        throw new Error('No sheet name found for current bank & user combo!');
    }
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
        default:
            throw new Error('Unsupported bank provided. No parser found!');
    }
}

export { getContext }
