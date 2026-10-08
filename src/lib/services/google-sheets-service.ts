import { Transaction } from '../types/transaction';
import { Bank } from '../types/bank';
import { generateSheetName } from '../utils/sheet-naming';
import { UploadResult } from '../types/upload-result';

export interface SheetsContext {
  bank: Bank;
  user: string;
  sheetName: string;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;

  private constructor() {}

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  /**
   * Import transactions to Google Sheets.
   * Pass `{ dryRun: true }` to read & compare only — nothing is written.
   */
  async importToSheets(
    transactions: Transaction[], 
    context: SheetsContext,
    spreadsheetId: string,
    accessToken: string,
    options: { dryRun?: boolean } = {}
  ): Promise<UploadResult> {
    const { dryRun = false } = options;

    if (!transactions || transactions.length === 0) {
      console.log('No transactions to import.');
      return {
        success: true,
        existingTransactionsCount: 0,
        fileTransactionsCount: 0,
        newTransactionsCount: 0,
        writtenTransactionsCount: 0,
        newTransactions: []
      };
    }

    try {
      console.log(`${dryRun ? '🔎 DRY RUN' : '📊'} PARSED TRANSACTIONS: ${transactions.length} transactions from file`);
      console.log(`📋 SHEET: ${context.sheetName} (${context.user} + ${context.bank})`);
      
      // Validate transactions before processing
      this.validateTransactions(transactions);
      
      // Get existing data to avoid duplicates
      let existingTransactions: Transaction[] = [];
      let needsHeaders = false;
      try {
        existingTransactions = await this.getDataFromSheets(
          spreadsheetId, 
          context.sheetName, 
          accessToken
        );
        console.log(`📈 EXISTING TRANSACTIONS: ${existingTransactions.length} transactions already in sheet`);
        
        // Check if we need headers (only if sheet is empty)
        if (existingTransactions.length === 0) {
          needsHeaders = await this.checkIfSheetNeedsHeaders(spreadsheetId, context.sheetName, accessToken);
        }
      } catch (sheetError) {
        // If sheet doesn't exist, this is a critical error
        console.error('❌ CRITICAL: Sheet tab does not exist:', sheetError);
        throw sheetError;
      }
      
      // Find new transactions (not already in sheet)
      const transactionsToWrite = this.findNewTransactions(transactions, existingTransactions);
      
      console.log(`🆕 NEW TRANSACTIONS: ${transactionsToWrite.length} transactions to ${dryRun ? 'preview' : 'write'}`);
      console.log(`📝 DUPLICATES FILTERED: ${transactions.length - transactionsToWrite.length} transactions already exist`);
      
      if (transactionsToWrite.length > 0 && !dryRun) {
        await this.appendDataToSheets(
          spreadsheetId, 
          context.sheetName, 
          transactionsToWrite, 
          accessToken,
          needsHeaders
        );
        console.log(`✅ SUCCESS: ${transactionsToWrite.length} transactions written to Google Sheets`);
      } else if (transactionsToWrite.length > 0 && dryRun) {
        console.log(`🔎 DRY RUN: Would write ${transactionsToWrite.length} transactions (headers needed: ${needsHeaders})`);
      } else {
        console.log('ℹ️  INFO: No new transactions to import (all already exist)');
      }

      // Return detailed results
      return {
        success: true,
        existingTransactionsCount: existingTransactions.length,
        fileTransactionsCount: transactions.length,
        newTransactionsCount: transactionsToWrite.length,
        writtenTransactionsCount: dryRun ? 0 : transactionsToWrite.length,
        newTransactions: transactionsToWrite
      };
    } catch (error) {
      console.error(`❌ ERROR ${dryRun ? 'during dry run' : 'importing to Sheets'}:`, error);
      return {
        success: false,
        existingTransactionsCount: 0,
        fileTransactionsCount: transactions.length,
        newTransactionsCount: 0,
        writtenTransactionsCount: 0,
        newTransactions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quote/encode a sheet tab for A1 notation in Sheets API URLs.
   * Sheet names with spaces (e.g. "Lauri NordeaFI") must be single-quoted.
   */
  private encodeSheetRange(sheetName: string, cellRange?: string): string {
    const quoted = `'${sheetName.replace(/'/g, "''")}'`;
    const a1 = cellRange ? `${quoted}!${cellRange}` : quoted;
    return encodeURIComponent(a1);
  }

  /**
   * Get existing transactions from Google Sheets.
   * Uses UNFORMATTED_VALUE so Finnish (and other) locales don't return
   * comma-decimals / locale-formatted dates that break duplicate detection.
   */
  private async getDataFromSheets(
    spreadsheetId: string, 
    sheetName: string, 
    accessToken: string
  ): Promise<Transaction[]> {
    try {
      const range = this.encodeSheetRange(sheetName, 'A1:I');
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check for specific Google Sheets API errors
        if (response.status === 400) {
          const errorMessage = errorData.error?.message || response.statusText;
          if (errorMessage.includes('Unable to parse range') || errorMessage.includes('Invalid range')) {
            throw new Error(`Sheet tab "${sheetName}" does not exist. Please create the sheet tab first.`);
          }
        }
        
        throw new Error(`Failed to read from sheets, probably because the Sheet ID is incorrect. Message from the Sheets API: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];
      
      return this.mapRowsToTransactions(rows, sheetName);
    } catch (error) {
      console.error('Error reading from sheets:', error);
      // Re-throw the error instead of returning empty array
      throw error;
    }
  }

  /**
   * Append new transactions to Google Sheets
   */
  private async appendDataToSheets(
    spreadsheetId: string,
    sheetName: string,
    transactions: Transaction[],
    accessToken: string,
    needsHeaders: boolean = false
  ): Promise<void> {
    let body = this.mapTransactionsToRows(transactions);
    
    // Add headers if needed
    if (needsHeaders) {
      const headers = this.getTransactionHeaders();
      body = [headers, ...body];
      console.log('📋 HEADERS: Adding headers to empty sheet');
    }
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${this.encodeSheetRange(sheetName)}:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: body
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to append to sheets: ${response.statusText}`);
    }

    await response.json();
    console.log('Data appended successfully');
  }

  /**
   * Find transactions that don't already exist in the sheet
   */
  private findNewTransactions(newTransactions: Transaction[], existingTransactions: Transaction[]): Transaction[] {
    console.log(`🔍 DUPLICATE DETECTION: Checking ${newTransactions.length} new vs ${existingTransactions.length} existing`);

    const newTransactionsFiltered = newTransactions.filter(
      (newTransaction) => !existingTransactions.some((existing) => this.areTransactionsEqual(newTransaction, existing))
    );

    console.log(`🔍 DUPLICATE DETECTION RESULT: ${newTransactionsFiltered.length} new transactions after filtering`);
    return newTransactionsFiltered;
  }

  /**
   * Validate that transactions have valid essential fields
   * Throws an error if validation fails
   */
  private validateTransactions(transactions: Transaction[]): void {
    if (!transactions || transactions.length === 0) {
      return; // Empty transactions are handled elsewhere
    }

    const invalidTransactions: string[] = [];
    
    transactions.forEach((transaction, index) => {
      const issues: string[] = [];
      
      // Check month (should be 1-12)
      if (!transaction.month || transaction.month < 1 || transaction.month > 12) {
        issues.push(`Invalid month: ${transaction.month}`);
      }
      
      // Check year (should be reasonable range, e.g., 1900-2100)
      if (!transaction.year || transaction.year < 1900 || transaction.year > 2100) {
        issues.push(`Invalid year: ${transaction.year}`);
      }
      
      // Check amount (should be a valid number)
      if (transaction.amount === undefined || transaction.amount === null || isNaN(transaction.amount)) {
        issues.push(`Invalid amount: ${transaction.amount}`);
      }
      
      if (issues.length > 0) {
        invalidTransactions.push(`Row ${index + 1}: ${issues.join(', ')}`);
      }
    });
    
    if (invalidTransactions.length > 0) {
      const errorMessage = `Invalid transaction data detected. This might be the wrong bank file format.\n\nIssues found:\n${invalidTransactions.slice(0, 5).join('\n')}${invalidTransactions.length > 5 ? `\n... and ${invalidTransactions.length - 5} more issues` : ''}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Parse numbers from Sheets/CSV, including Finnish-locale strings ("-1 249,74").
   */
  private parseLocaleNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (value == null || value === '') {
      return 0;
    }

    let s = String(value).trim().replace(/[\s\u00A0\u202F]/g, '');
    if (!s) {
      return 0;
    }

    if (s.includes(',') && s.includes('.')) {
      // European 1.234,56 vs US 1,234.56 — last separator is the decimal.
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }

    const parsed = parseFloat(s);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeAmount(value: unknown): number {
    return Math.round(this.parseLocaleNumber(value) * 100) / 100;
  }

  /**
   * Convert Sheets serial date (days since 1899-12-30) to a UTC calendar date.
   */
  private sheetsSerialToUtcDate(serial: number): Date {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  }

  /**
   * Normalize dates to YYYY-MM-DD for comparison.
   * Accepts app format DD/MM/YYYY, Finnish D.M.YYYY, ISO, and Sheets serials.
   */
  private normalizeDateKey(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      // Likely a Sheets serial (typical range ~30000–60000 for modern dates)
      if (value > 20000 && value < 100000) {
        const d = this.sheetsSerialToUtcDate(value);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      }
      return '';
    }

    const s = String(value).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    // DD/MM/YYYY, D/M/YYYY, DD.MM.YYYY, D.M.YYYY
    const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }

    return s.toLowerCase();
  }

  /** Convert sheet/file date values to the app's DD/MM/YYYY canonical form. */
  private toAppDateString(value: unknown): string {
    const key = this.normalizeDateKey(value);
    const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return value == null ? '' : String(value);
    }
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  /**
   * Compare two transactions for equality
   * Handles type mismatches between Google Sheets (strings) and CSV data (parsed types)
   */
  private areTransactionsEqual(t1: Transaction, t2: Transaction): boolean {
    // Normalize data for comparison
    const normalizeString = (str: string): string => {
      return str?.toString().trim().toLowerCase() || '';
    };

    const normalizeNumber = (num: number | string): number => {
      return this.parseLocaleNumber(num);
    };

    // Compare normalized values
    const monthEqual = normalizeNumber(t1.month) === normalizeNumber(t2.month);
    const yearEqual = normalizeNumber(t1.year) === normalizeNumber(t2.year);
    const dateEqual = this.normalizeDateKey(t1.date) === this.normalizeDateKey(t2.date);
    const amountEqual = this.normalizeAmount(t1.amount) === this.normalizeAmount(t2.amount);
    const amountEurEqual = this.normalizeAmount(t1.amountEur) === this.normalizeAmount(t2.amountEur);
    const payeeEqual = normalizeString(t1.payee) === normalizeString(t2.payee);
    // Special handling for transactionType field - normalize empty states
    const normalizeTransactionType = (type: string): string => {
      const normalized = normalizeString(type);
      return normalized === '' || normalized === 'undefined' || normalized === 'null' ? '' : normalized;
    };
    const transactionTypeEqual = normalizeTransactionType(t1.transactionType) === normalizeTransactionType(t2.transactionType);
    // Special handling for message field - normalize empty states
    const normalizeMessage = (msg: string): string => {
      const normalized = normalizeString(msg);
      return normalized === '' || normalized === 'undefined' || normalized === 'null' ? '' : normalized;
    };
    const messageEqual = normalizeMessage(t1.message) === normalizeMessage(t2.message);
    
    return monthEqual && yearEqual && dateEqual && amountEqual && amountEurEqual && payeeEqual && transactionTypeEqual && messageEqual;
  }

  /**
   * Convert transactions to rows for Google Sheets
   */
  private mapTransactionsToRows(transactions: Transaction[]): (string | number)[][] {
    return transactions.map(transaction => [
      transaction.month,
      transaction.year,
      transaction.date,
      transaction.amount,
      transaction.amountEur,
      transaction.payee,
      transaction.transactionType,
      transaction.message,
      transaction.category || '' // Include category if available
    ]);
  }

  /**
   * Convert rows from Google Sheets to transactions
   * Handles headers by detecting and skipping them
   */
  private mapRowsToTransactions(rows: (string | number)[][], sheetName?: string): Transaction[] {
    if (!rows || rows.length === 0) {
      return [];
    }

    // Check if first row contains headers (non-numeric values in key columns)
    const firstRow = rows[0];
    const hasHeaders = this.detectHeaders(firstRow);
    
    // Skip header row if detected
    const dataRows = hasHeaders ? rows.slice(1) : rows;
    
    const sheetInfo = sheetName ? `[${sheetName}] ` : '';
    console.log(`📋 HEADER DETECTION ${sheetInfo}: ${hasHeaders ? 'Headers detected, skipping first row' : 'No headers detected'}`);
    console.log(`📊 PROCESSING ${sheetInfo}: ${dataRows.length} data rows from ${rows.length} total rows`);
    
      return dataRows.map(row => {
        try {
          return new Transaction({
            month: Math.trunc(this.parseLocaleNumber(row[0])) || 0,
            year: Math.trunc(this.parseLocaleNumber(row[1])) || 0,
            date: this.toAppDateString(row[2]),
            amount: this.parseLocaleNumber(row[3]),
            amountEur: this.parseLocaleNumber(row[4]),
            payee: String(row[5] ?? '') || '',
            transactionType: String(row[6] ?? '') || '',
            message: this.safeString(row[7]),
            category: this.safeString(row[8]) || undefined
          });
        } catch (error) {
          console.warn('⚠️  Skipping invalid row:', row, error);
          return null;
        }
      }).filter(transaction => transaction !== null) as Transaction[];
  }

  /**
   * Safely convert a value to string, handling undefined/null/empty cases
   */
  private safeString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    // Handle the case where undefined becomes the string "undefined"
    return str === 'undefined' || str === 'null' ? '' : str;
  }

  /**
   * Detect if the first row contains headers
   */
  private detectHeaders(firstRow: (string | number)[]): boolean {
    if (!firstRow || firstRow.length < 3) {
      return false;
    }

    const month = this.parseLocaleNumber(firstRow[0]);
    const isMonthNumeric = Number.isFinite(month) && month >= 1 && month <= 12
      && String(firstRow[0]).trim() !== ''
      && !/^[a-zA-Z]/.test(String(firstRow[0]).trim());

    const amountRaw = firstRow[3];
    const amountIsBlank = amountRaw == null || String(amountRaw).trim() === '';
    const amount = this.parseLocaleNumber(amountRaw);
    // Header labels like "Amount" parse to 0 — treat non-numeric labels as headers.
    const amountLooksNumeric = !amountIsBlank && (
      typeof amountRaw === 'number' || /[-+]?\d/.test(String(amountRaw))
    ) && Number.isFinite(amount);

    return !isMonthNumeric || !amountLooksNumeric;
  }

  /**
   * Check if the sheet needs headers (only called when sheet is empty)
   */
  private async checkIfSheetNeedsHeaders(
    spreadsheetId: string,
    sheetName: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      // Since we know the sheet is empty (no transactions), check if there are any raw rows
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${this.encodeSheetRange(sheetName, 'A1:I1')}?valueRenderOption=UNFORMATTED_VALUE`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If we can't read the sheet, assume it needs headers
        console.log('📋 SHEET STATUS: Cannot read sheet, will add headers');
        return true;
      }

      const data = await response.json();
      const rows = data.values || [];
      
      // If no raw data at all, sheet is completely empty and needs headers
      if (rows.length === 0) {
        console.log('📋 SHEET STATUS: Sheet is completely empty, will add headers');
        return true;
      }
      
      const firstRow = rows[0];
      const hasHeaders = this.detectHeaders(firstRow);
      
      if (hasHeaders) {
        console.log('📋 SHEET STATUS: Headers already exist, will not add headers');
        return false;
      }
      
      // If first row has data but no headers, we need to add headers
      console.log('📋 SHEET STATUS: First row has data but no headers, will add headers');
      return true;
      
    } catch (error) {
      console.error('Error checking sheet headers:', error);
      // If we can't determine, assume it needs headers
      return true;
    }
  }

  /**
   * Get the transaction headers based on Transaction class properties
   */
  private getTransactionHeaders(): string[] {
    return [
      'Month',
      'Year', 
      'Date',
      'Amount',
      'AmountEur',
      'Payee',
      'TransactionType',
      'Message',
      'Category'
    ];
  }

  /**
   * Create a context for sheets operations
   */
  createContext(bank: Bank, userName: string): SheetsContext {
    return {
      bank,
      user: userName,
      sheetName: generateSheetName(userName, bank)
    };
  }

  /**
   * Parse Google Sheets URL to extract spreadsheet ID
   */
  parseGoogleSheetsUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'docs.google.com') {
        throw new Error('Invalid Google Sheets URL');
      }
      
      const pathMatch = urlObj.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!pathMatch) {
        throw new Error('Could not extract spreadsheet ID from URL');
      }
      
      return pathMatch[1];
    } catch (error) {
      console.error('Error parsing Google Sheets URL:', error);
      return null;
    }
  }

  /**
   * Validate access to a Google Sheets URL
   */
  async validateGoogleSheetsAccess(url: string, accessToken: string): Promise<boolean> {
    try {
      const spreadsheetId = this.parseGoogleSheetsUrl(url);
      if (!spreadsheetId) {
        return false;
      }

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?access_token=${accessToken}`
      );
      
      return response.ok;
    } catch (error) {
      console.error('Error validating Google Sheets access:', error);
      return false;
    }
  }

  /**
   * Get historical transactions with categories from a specific Google Sheets
   */
  async getHistoricalTransactionsWithCategories(
    url: string,
    accessToken: string,
    validSheetNames?: string[]
  ): Promise<Transaction[]> {
    try {
      const spreadsheetId = this.parseGoogleSheetsUrl(url);
      if (!spreadsheetId) {
        throw new Error('Invalid Google Sheets URL');
      }

      // Get all sheet names first
      const sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?access_token=${accessToken}`
      );
      
      if (!sheetsResponse.ok) {
        throw new Error('Failed to access spreadsheet');
      }

      const sheetsData = await sheetsResponse.json();
      const allSheetNames = sheetsData.sheets?.map((sheet: { properties: { title: string } }) => sheet.properties.title) || [];
      
      // Filter to only valid sheet names if provided
      const sheetNamesToRead = validSheetNames 
        ? allSheetNames.filter(sheetName => validSheetNames.includes(sheetName))
        : allSheetNames;
      
      console.log(`📊 Reading ${sheetNamesToRead.length} sheets: ${sheetNamesToRead.join(', ')}`);
      
      // Fetch data from filtered sheets and combine
      const allTransactions: Transaction[] = [];
      
      for (const sheetName of sheetNamesToRead) {
        try {
          const transactions = await this.getDataFromSheets(spreadsheetId, sheetName, accessToken);
          allTransactions.push(...transactions);
          console.log(`📈 Read ${transactions.length} transactions from sheet: ${sheetName}`);
        } catch (error) {
          console.warn(`Failed to read sheet ${sheetName}:`, error);
        }
      }

      // Filter transactions that have categories
      const categorizedTransactions = allTransactions.filter(transaction => 
        transaction.category && transaction.category.trim() !== ''
      );
      
      console.log(`🏷️  Found ${categorizedTransactions.length} transactions with categories out of ${allTransactions.length} total`);
      
      return categorizedTransactions;
    } catch (error) {
      console.error('Error fetching historical transactions:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from multiple Google Sheets and combine them
   */
  async fetchTransactionsFromMultipleSheets(
    urls: string[],
    accessToken: string,
    validSheetNames?: string[]
  ): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    const seenTransactions = new Set<string>();

    for (const url of urls) {
      try {
        const transactions = await this.getHistoricalTransactionsWithCategories(url, accessToken, validSheetNames);
        
        // Deduplicate based on transaction signature
        for (const transaction of transactions) {
          const signature = `${transaction.date}-${transaction.amount}-${transaction.payee}`;
          if (!seenTransactions.has(signature)) {
            seenTransactions.add(signature);
            allTransactions.push(transaction);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch from ${url}:`, error);
        throw error;
      }
    }

    return allTransactions;
  }
}
