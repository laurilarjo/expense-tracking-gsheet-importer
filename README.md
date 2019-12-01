# Expense Tracking - Google Sheets importer
Parse Nordea TSV transaction files and import data to Google Sheets.

## Usage
1. Go here and click "Enable Google Sheet API" to download the file: [https://developers.google.com/sheets/api/quickstart/nodejs](https://developers.google.com/sheets/api/quickstart/nodejs). Put that `credentials.json` to project root.

1. Run `npm run start -- Tapahtumat_long.txt --read-sheet`.

Possible other commands:
`npm run start -- Tapahtumat_long.txt --import`
`npm run start -- Tapahtumat_long.txt --read-file`


## TODO
- [x] Basic Read sheets
- [x] Basic write transactions to sheets
- [x] Read sheets and filter transactions based on it, so we don't add duplicate data
- [x] Write data by appending to end of file
- [ ] Add support to read OP
- [ ] Add support to read Nordea Sweden
- [ ] Add support to read Handelsbanken Sweden
- [ ] Add support to read Norwegian (Finland)
- [ ] Detect what Sheet to use based on imported file
- [ ] Change logging to Winston
