# Expense Tracking - Google Sheets importer
Parse Nordea TSV transaction files and import data to Google Sheets.

## Usage
1. Make a copy of this sample sheet to your own account and use it as a base (header rows come from it): [https://docs.google.com/spreadsheets/d/1F78PxLNPdAFrcS8XjPI_hTAyh4knTVqq8kd-8ilmDSA/](https://docs.google.com/spreadsheets/d/1F78PxLNPdAFrcS8XjPI_hTAyh4knTVqq8kd-8ilmDSA/)

1. Go here and click "Enable Google Sheet API" to download the file: [https://developers.google.com/sheets/api/quickstart/nodejs](https://developers.google.com/sheets/api/quickstart/nodejs). Put that `credentials.json` to project root.

1. Possible commands to run: 
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
- [ ] Change logging to Winston
- [ ] Do not add Norwegian's "Katevaraus" type
- [ ] Do not add Handelsbankens if message has a prefix "Prel "

## Nice to do
- [x] Change currency exchange library to something newer. Current has dependencies to deprecated libs.
