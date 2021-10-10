# Expense Tracking - Google Sheets importer
Parse Nordea TSV transaction files and import data to Google Sheets.

## Usage
1. Make a copy of this sample sheet to your own account and use it as a base (header rows come from it): [https://docs.google.com/spreadsheets/d/1F78PxLNPdAFrcS8XjPI_hTAyh4knTVqq8kd-8ilmDSA/](https://docs.google.com/spreadsheets/d/1F78PxLNPdAFrcS8XjPI_hTAyh4knTVqq8kd-8ilmDSA/)

1. Go here and complete the "prerequisites" section: [https://developers.google.com/sheets/api/quickstart/nodejs](https://developers.google.com/sheets/api/quickstart/nodejs).
    1. Create a project in Google Cloud Platform
    1. Enable the Spreadsheets API for it
    1. Create OAuth client ID credentials for a desktop app, and download the json file. Rename it to `credentials.json` and put to root of this project.
    1. Run the app, and select `LoginToSheets` from the run-mode options.
    1. This should trigger OAuth flow, and end up with a `token.json` in your root folder.

1. Setup the .env for your users and sheets.

2. OPTIONAL. If you need exchange rates, create a free account to [https://exchangeratesapi.io/](https://exchangeratesapi.io/) and add access-key to .env.
 
3. Possible commands to run: 
* `npm run start` to enter interactive mode
* Only read the file, don't interact with GSheets: `npm run read-file -- --file=./sample-files/Tapahtumat_nordea_sample.txt`
* Read GSheets data `npm run read-sheets`.
* Read the file and import to GSheets: `npm run import -- --file=./sample-files/Tapahtumat_nordea_sample.txt`




## TODO
- [x] Basic Read sheets
- [x] Basic write transactions to sheets
- [x] Read sheets and filter transactions based on it, so we don't add duplicate data
- [x] Write data by appending to end of file
- [x] Add support to read OP
- [x] Add support to read Nordea Sweden
- [x] Add support to read Handelsbanken Sweden
- [x] Add support to read Norwegian (Finland)
- [x] Bank detection from files won't work. Change to interactive console instead.
- [x] Do not add Handelsbankens if message has a prefix "Prel "
- [ ] Change logging to Winston
- [ ] Do not add Norwegian's "Katevaraus" type

## Nice to do
- [x] Change currency exchange library to something newer. Current has dependencies to deprecated libs.
