import * as fs from 'fs';
import * as path from 'path';

import { nordeaParse } from './lib/nordea-parse';

if (!process.argv[2]) {
    console.log('File argument missing!')
    process.exit(9);
}

const fileName = process.argv[2];
const filePath = path.join(process.cwd(), fileName);

nordeaParse(filePath);