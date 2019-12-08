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
    return new Promise((resolve, reject) => {
        
        let rowCounter = 0;
        let found = false;

        let stream = fs.createReadStream(filePath);
        let rl = readline.createInterface({
            input: stream
        });

        rl.on('line', (line) => {
            rowCounter++;

            
            if (_.includes(line, config.FILE_DETECTION_NORDEA_LAURI)) {
                context.user = User.Lauri;
                context.bank = Bank.NordeaFI;
                found = true;
            } else if (_.includes(line, config.FILE_DETECTION_OP_LAURI)) {
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