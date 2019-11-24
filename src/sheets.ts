import fs = require('fs');
import util = require('util');
import readline = require('readline');
import {google, oauth2_v2} from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { Payment } from './lib/types';
import { Credentials } from 'google-auth-library';
import config from './lib/config';
const nordeaParse = require('./lib/nordea-parse').nordeaParse;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
let readFile = util.promisify(fs.readFile);

run();

async function run() {
  // Load client secrets from a local file.
  
  try {
    let content = await readFile('credentials.json');
    
    // Authorize a client with credentials, then call the Google Sheets API.
    let oAuth2Client = await authorize(JSON.parse(content.toString())) as OAuth2Client;
    let data = await readNordeaData(config.NORDEA_TRANSACTIONS_FILENAME);
    await writeToSheets(oAuth2Client, data);
  } catch (err) {
    console.log('Error loading client secret file:', err);
  }
}

async function readNordeaData(fileName: string) {
    console.log('read data');
    return await nordeaParse(process.cwd() + '/' + fileName);
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials: any): Promise<OAuth2Client | void> {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    let token = await readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    return oAuth2Client;
  } catch(err) {
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
async function writeToSheets(oAuth2Client: OAuth2Client, data: Payment[]): Promise<void> {
  const sheets = google.sheets({version: 'v4', auth: oAuth2Client});
  
  sheets.spreadsheets.values.get({
    spreadsheetId: config.SPREADSHEET_ID,
    range: 'Sheet1!A2:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    if (res == null) return console.log('Nope');
    const rows = res.data.values as [];
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
  
  sheets.spreadsheets.values.update({
    spreadsheetId: config.SPREADSHEET_ID,
    range: 'Sheet1!A7:B8',
    valueInputOption: 'RAW',
    requestBody: { 'values': [['mikko', 'pekka'], ['lotta', 'jessi']] }
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    
    console.log(res);
  });
}