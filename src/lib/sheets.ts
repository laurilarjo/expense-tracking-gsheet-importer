import fs = require('fs');
import util = require('util');
import readline = require('readline');
import {isEmpty} from 'lodash';
import { google, oauth2_v2, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { Transaction } from './types';
import { Credentials } from 'google-auth-library';
import config from './config';
import { nordeaParse } from './nordea-parse';
import { start } from 'repl';

/** SETTINGS FOR SHEETS */
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const CREDENTIALS_FILE = 'credentials.json';
const LAST_COLUMN = 'H';

let readFile = util.promisify(fs.readFile);

async function importToSheets(transactions: Transaction[]): Promise<void> {
  
  if (isEmpty(transactions)) {
    return;
  }

  try {
    const sheets = await setupSheets();
    await writeToSheets(sheets, transactions);
  } catch (err) {
    console.log('Error loading client secret file:', err);
  }
}

async function readFromSheets(): Promise<Transaction[]> {
  try {
    const sheets = await setupSheets();
    return await getDataFromSheets(sheets);
  } catch (err) {
    throw new Error('Error loading client secret file: ' + err);
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
async function writeToSheets(sheets: sheets_v4.Sheets, transactions: Transaction[]): Promise<void> {
  
  const rowCount = transactions.length;
  const startRow = 1;
  const endRow = startRow + transactions.length;

  const range = `Sheet1!A${startRow}:${LAST_COLUMN}${endRow}`;
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

async function getDataFromSheets(sheets: sheets_v4.Sheets): Promise<Transaction[]> {

  let rows = [] as any[][];

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SPREADSHEET_ID,
      range: `Sheet1!A1:${LAST_COLUMN}`,
    });
    if (res == null) {
      throw new Error('No content from GSheet: ');
    }
    rows = res.data.values as [];
    if (rows && rows.length) {
      rows.map((row) => {
        console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
    return mapRowsToTransaction(rows); 
  } catch(err) {
      throw new Error('The API returned an error: ' + err);
  }
 
  
}

function mapTransactionsToRows(transactions: Transaction[]) {
  return transactions.map(x => {
    return [x.month, x.year, x.date, x.outflow, x.inflow, x.payee, x.transactionType, x.message];
  });
}

function mapRowsToTransaction(rows: any[][]) {
  let transactions = [] as Transaction[];
  let result = rows.map(row => {
    console.log(row);
    return transactions.push({ 
      month: row[0],
      year: row[1],
      date: row[2],
      outflow: row[3],
      inflow: row[4],
      payee: row[5],
      transactionType: row[6],
      message: row[7],
    });
  });
  
  return transactions;
}

export {importToSheets, readFromSheets};