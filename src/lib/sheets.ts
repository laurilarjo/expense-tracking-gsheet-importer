import fs = require('fs');
import util = require('util');
import readline = require('readline');
import * as _ from 'lodash';
import { google, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { Transaction, Context, Bank, User } from './types';
import { Credentials } from 'google-auth-library';
import config from './config';



/** SETTINGS FOR SHEETS */
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const CREDENTIALS_FILE = 'credentials.json';
const LAST_COLUMN = 'H'; //last column with useful values in GSheet 

let readFile = util.promisify(fs.readFile);

/**
 * Exported.
 * 
 * @param newTransactions Array of transactions to import into GSheets.
 * @param context Context including user & bank we're dealing with.
 */
async function importToSheets(newTransactions: Transaction[], context: Context): Promise<void> {
  
  if (_.isEmpty(newTransactions)) {
    console.log('No transactions to import.');
    return;
  }

  try {
    const sheets = await setupSheets();
    const existingTransactions = await getDataFromSheets(sheets, context);
    console.log('Comparing new data to existing Sheet data...');
    console.log(existingTransactions);
    console.log('existingTransasctions length: ' + existingTransactions.length);
    console.log('newTransasctions length: ' + newTransactions.length);
    
    // TODO: Now with currency conversions added, the results won't match if exchange rate has changed. Fix this.
    const transactionsToWrite = _.differenceWith(newTransactions, existingTransactions, _.isEqual);

    console.log('After comparison, going to write:');
    console.log(transactionsToWrite.length);
    console.log('Writing...');
    console.log(transactionsToWrite);
    if (transactionsToWrite.length > 0) {
      await appendDataToSheets(sheets, transactionsToWrite, context);
    }
  } catch (err) {
    console.log('Error importing to Sheets:', err);
  }
}

async function compareToSheets(newTransactions: Transaction[], context: Context): Promise<void> {
  if (_.isEmpty(newTransactions)) {
    console.log('No transactions to import.');
    return;
  }

  try {
    const sheets = await setupSheets();
    const existingTransactions = await getDataFromSheets(sheets, context);
    console.log('Comparing new data to existing Sheet data...');
    console.log(existingTransactions);
    console.log('existingTransasctions length: ' + existingTransactions.length);
    console.log('newTransasctions length: ' + newTransactions.length);
    
    // TODO: Now with currency conversions added, the results won't match if exchange rate has changed. Fix this.
    const transactionsToWrite = _.differenceWith(newTransactions, existingTransactions, _.isEqual);

    console.log('After comparison, going to write:');
    console.log(transactionsToWrite.length);
  } catch (err) {
    console.log('Error importing to Sheets:', err);
  }
}

/**
 * Exported.
 * 
 * @param context Context including user & bank we're dealing with.
 */
async function readFromSheets(context: Context): Promise<Transaction[]> {
  try {
    const sheets = await setupSheets();
    return await getDataFromSheets(sheets, context);
  } catch (err) {
    throw new Error('Error reading from Sheets: ' + err);
  }
}

async function setupSheets(): Promise<sheets_v4.Sheets> {
  // Load client secrets from a local file.
  let content = await readFile(CREDENTIALS_FILE) as any;
  const credentials = JSON.parse(content.toString());

  // Authorize a client with credentials, then call the Google Sheets API.
  let oAuth2Client = await authorize(credentials) as OAuth2Client;
  return google.sheets({version: 'v4', auth: oAuth2Client});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials: any): Promise<OAuth2Client | void> {

  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  try {
    // Check if we have previously stored a token.
    let token = await readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    return oAuth2Client;
  } catch(err) {
    // get new one if we don't
    return await getNewToken(oAuth2Client);
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
async function getNewToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client | void> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token as Credentials);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      return oAuth2Client;
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} oAuth2Client The authenticated Google OAuth client.
 */
async function updateToSheets(sheets: sheets_v4.Sheets, transactions: Transaction[], context: Context): Promise<void> {
  
  const sheetName = getSheetName(context);
  const startRow = 1;
  const endRow = startRow + transactions.length;

  const range = `${sheetName}!A${startRow}:${LAST_COLUMN}${endRow}`;
  const body = mapTransactionsToRows(transactions);

  sheets.spreadsheets.values.update({
    spreadsheetId: config.SPREADSHEET_ID,
    range: range,
    valueInputOption: 'RAW',
    requestBody: { 'values': body }
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    
    console.log(res);
    console.log('Data imported!');
  });
  
}

async function getDataFromSheets(sheets: sheets_v4.Sheets, context: Context): Promise<Transaction[]> {

  let rows = [] as any[][];
  let sheetName = getSheetName(context);
  console.log(`Reading sheet: ${sheetName}`);

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `${sheetName}!A2:${LAST_COLUMN}`, // skips header (row1) as we're only interested in transactions
    });
    if (res == null) {
      throw new Error('No content from GSheet: ');
    }
    rows = res.data.values as [];
    return mapRowsToTransaction(rows); 
  } catch(err) {
      throw new Error('The API returned an error: ' + err);
  }
 
}

async function appendDataToSheets(sheets: sheets_v4.Sheets, transactions: Transaction[], context: Context): Promise<void> {
  const range = getSheetName(context);
  console.log(`Appending to sheet: ${range}`);
  const body = mapTransactionsToRows(transactions);

  try {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: config.SPREADSHEET_ID,
      range: range,
      valueInputOption: 'RAW',
      requestBody: { 'values': body }
    });

    if (result == null) {
      throw new Error('No content from GSheet: ');
    }
    console.log(`Data imported! ${transactions.length} rows written`);
  } catch (error) {
      throw new Error('The API returned an error: ' + error);
  }
}

function mapTransactionsToRows(transactions: Transaction[]) {
  return transactions.map(x => {
    return [x.month, x.year, x.date, x.amount, x.amountEur, x.payee, x.transactionType, x.message];
  });
}

function mapRowsToTransaction(rows: any[][]): Transaction[] {
  let transactions: Transaction[] = [];
  if (rows) {
    transactions = rows.map(row => {
      return new Transaction({
        month: parseInt(row[0]),
        year: row[1],
        date: row[2],
        amount: parseFloat(row[3]),
        amountEur: parseFloat(row[4]),
        payee: row[5] || '',
        transactionType: row[6] || '',
        message: row[7] || ''
      });
    });
  }
  
  return transactions;
}

function getSheetName(context: Context): string {
  if (context.bank === undefined || context.user === undefined || context.sheetName === undefined) {
    throw new Error('Bank, User or SheetName not set in Context');
  }
  return context.sheetName;
}

export {importToSheets, compareToSheets, readFromSheets};