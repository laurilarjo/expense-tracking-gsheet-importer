"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
const nordeaParse = require('./lib/nordea-parse').nordeaParse;
if (!process.argv[2]) {
    console.log('File argument missing!');
    process.exit(9);
}
const fileName = process.argv[2];
const filePath = path.join(process.cwd(), fileName);
nordeaParse(filePath);
