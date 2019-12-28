/**
 * Reads Nordea Finland bank's transaction files in TSV format and 
 * outputs into Google Spreadsheet format.
 */
import * as fs from 'fs';
import * as readline from 'readline';
import * as _ from 'lodash';

import config from './lib/config';
import { Context, User, Bank } from './lib/types';

async function detectBankAndUserFromFile(filePath: string, context: Context): Promise<Context> {
    if (filePath.endsWith('xlsx')) {
        // TODO: we can't detect user from here.
        context.user = User.Lauri;
        context.bank = Bank.Norwegian;
        return context;
    }
    if (filePath.endsWith('xls')) {
        // TODO: we can't detect user from here.
        context.user = User.Lauri;
        context.bank = Bank.Handelsbanken;
        return context;
    }
    return new Promise((resolve, reject) => {
        
        let found = false;

        let stream = fs.createReadStream(filePath);
        let rl = readline.createInterface({
            input: stream
        });

        rl.on('line', (line) => {
            
            if (_.includes(line, config.FILE_DETECTION_NORDEA_LAURI)) {
                context.user = User.Lauri;
                context.bank = Bank.NordeaFI;
                found = true;
            } else if (_.includes(line, config.FILE_DETECTION_OP_LAURI)) {
                // TODO: we actually can't detect user from this
                context.user = User.Lauri;
                context.bank = Bank.OP;
                found = true;
            }

            if (found) {
                rl.close();
                // readline buffers the lines, so without this it would still continue doing 'line' events.
                rl.removeAllListeners();
            }
        }).on('close', () => {
            resolve(context);
        }).on('error', err => {
            reject(err);
        })

    });
}

export {detectBankAndUserFromFile};
