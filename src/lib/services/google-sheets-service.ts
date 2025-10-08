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
   * Import transactions to Google Sheets
   */
  async importToSheets(
    transactions: Transaction[], 
    context: SheetsContext,
    spreadsheetId: string,
    accessToken: string
  ): Promise<UploadResult> {
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
      console.log(`📊 PARSED TRANSACTIONS: ${transactions.length} transactions from file`);
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
      
      console.log(`🆕 NEW TRANSACTIONS: ${transactionsToWrite.length} transactions to write`);
      console.log(`📝 DUPLICATES FILTERED: ${transactions.length - transactionsToWrite.length} transactions already exist`);
      
      if (transactionsToWrite.length > 0) {
        await this.appendDataToSheets(
          spreadsheetId, 
          context.sheetName, 
          transactionsToWrite, 
          accessToken,
          needsHeaders
        );
        console.log(`✅ SUCCESS: ${transactionsToWrite.length} transactions written to Google Sheets`);
      } else {
        console.log('ℹ️  INFO: No new transactions to import (all already exist)');
      }

      // Return detailed results
      return {
        success: true,
        existingTransactionsCount: existingTransactions.length,
        fileTransactionsCount: transactions.length,
        newTransactionsCount: transactionsToWrite.length,
        writtenTransactionsCount: transactionsToWrite.length,
        newTransactions: transactionsToWrite
      };
    } catch (error) {
      console.error('❌ ERROR importing to Sheets:', error);
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
   * Get existing transactions from Google Sheets
   */
  private async getDataFromSheets(
    spreadsheetId: string, 
    sheetName: string, 
    accessToken: string
  ): Promise<Transaction[]> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:I`,
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
      
      return this.mapRowsToTransactions(rows);
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW`,
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

    const result = await response.json();
    console.log('Data appended successfully:', result);
  }

  /**
   * Find transactions that don't already exist in the sheet
   */
  private findNewTransactions(newTransactions: Transaction[], existingTransactions: Transaction[]): Transaction[] {
    console.log(`🔍 DUPLICATE DETECTION: Checking ${newTransactions.length} new vs ${existingTransactions.length} existing`);
    
    const newTransactionsFiltered = newTransactions.filter((newTransaction, index) => {
      const isDuplicate = existingTransactions.some(existing => {
        const isEqual = this.areTransactionsEqual(newTransaction, existing);
        if (isEqual) {
          console.log(`🔄 DUPLICATE MATCH FOUND:`, {
            new: `${newTransaction.date} | ${newTransaction.amount} | ${newTransaction.payee} | "${newTransaction.message}"`,
            existing: `${existing.date} | ${existing.amount} | ${existing.payee} | "${existing.message}"`
          });
        }
        return isEqual;
      });
      
      if (isDuplicate) {
        console.log(`🔄 DUPLICATE FOUND: Transaction ${index + 1} already exists`);
        console.log(`   New: ${newTransaction.date} | ${newTransaction.amount} | ${newTransaction.payee} | "${newTransaction.message}"`);
      } else {
        console.log(`🆕 NEW TRANSACTION: Transaction ${index + 1} is new`);
        console.log(`   New: ${newTransaction.date} | ${newTransaction.amount} | ${newTransaction.payee} | "${newTransaction.message}"`);
      }
      
      return !isDuplicate;
    });
    
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
   * Compare two transactions for equality
   * Handles type mismatches between Google Sheets (strings) and CSV data (parsed types)
   */
  private areTransactionsEqual(t1: Transaction, t2: Transaction): boolean {
    // Normalize data for comparison
    const normalizeString = (str: string): string => {
      return str?.toString().trim().toLowerCase() || '';
    };

    const normalizeNumber = (num: number | string): number => {
      const parsed = typeof num === 'string' ? parseFloat(num) : num;
      return isNaN(parsed) ? 0 : parsed;
    };

    const normalizeAmount = (amount: number | string): number => {
      const normalized = normalizeNumber(amount);
      // Round to 2 decimal places to handle floating point precision issues
      return Math.round(normalized * 100) / 100;
    };

    // Compare normalized values
    const monthEqual = normalizeNumber(t1.month) === normalizeNumber(t2.month);
    const yearEqual = normalizeNumber(t1.year) === normalizeNumber(t2.year);
    const dateEqual = normalizeString(t1.date) === normalizeString(t2.date);
    const amountEqual = normalizeAmount(t1.amount) === normalizeAmount(t2.amount);
    const amountEurEqual = normalizeAmount(t1.amountEur) === normalizeAmount(t2.amountEur);
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
    
    const isEqual = monthEqual && yearEqual && dateEqual && amountEqual && amountEurEqual && payeeEqual && transactionTypeEqual && messageEqual;
    
    if (isEqual) {
      console.log(`✅ EQUAL: ${t1.date} | ${t1.amount} | ${t1.payee}`);
    } else {
      // Debug logging for failed comparisons
      console.log(`❌ NOT EQUAL:`, {
        month: { t1: t1.month, t2: t2.month, equal: monthEqual },
        year: { t1: t1.year, t2: t2.year, equal: yearEqual },
        date: { t1: t1.date, t2: t2.date, equal: dateEqual },
        amount: { t1: t1.amount, t2: t2.amount, equal: amountEqual },
        amountEur: { t1: t1.amountEur, t2: t2.amountEur, equal: amountEurEqual },
        payee: { t1: t1.payee, t2: t2.payee, equal: payeeEqual },
        transactionType: { 
          t1: `"${t1.transactionType}"`, 
          t2: `"${t2.transactionType}"`, 
          equal: transactionTypeEqual,
          normalized: { 
            t1: `"${normalizeTransactionType(t1.transactionType)}"`, 
            t2: `"${normalizeTransactionType(t2.transactionType)}"` 
          },
          raw: {
            t1: t1.transactionType,
            t2: t2.transactionType,
            t1Type: typeof t1.transactionType,
            t2Type: typeof t2.transactionType
          }
        },
        message: { 
          t1: `"${t1.message}"`, 
          t2: `"${t2.message}"`, 
          equal: messageEqual, 
          normalized: { 
            t1: `"${normalizeMessage(t1.message)}"`, 
            t2: `"${normalizeMessage(t2.message)}"` 
          },
          raw: {
            t1: t1.message,
            t2: t2.message,
            t1Type: typeof t1.message,
            t2Type: typeof t2.message
          }
        }
      });
    }
    
    return isEqual;
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
      '' // Empty Category column for user to fill manually
    ]);
  }

  /**
   * Convert rows from Google Sheets to transactions
   * Handles headers by detecting and skipping them
   */
  private mapRowsToTransactions(rows: (string | number)[][]): Transaction[] {
    if (!rows || rows.length === 0) {
      return [];
    }

    // Check if first row contains headers (non-numeric values in key columns)
    const firstRow = rows[0];
    const hasHeaders = this.detectHeaders(firstRow);
    
    // Skip header row if detected
    const dataRows = hasHeaders ? rows.slice(1) : rows;
    
    console.log(`📋 HEADER DETECTION: ${hasHeaders ? 'Headers detected, skipping first row' : 'No headers detected'}`);
    console.log(`📊 PROCESSING: ${dataRows.length} data rows from ${rows.length} total rows`);
    
      return dataRows.map(row => {
        try {
          return new Transaction({
            month: parseInt(String(row[0])) || 0,
            year: parseInt(String(row[1])) || 0,
            date: String(row[2]) || '',
            amount: parseFloat(String(row[3])) || 0,
            amountEur: parseFloat(String(row[4])) || 0,
            payee: String(row[5]) || '',
            transactionType: String(row[6]) || '',
            message: this.safeString(row[7])
            // Note: Category column (row[8]) is ignored when reading transactions
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

    // Check if month column (index 0) contains non-numeric data
    const monthValue = String(firstRow[0]);
    const isMonthNumeric = !isNaN(parseInt(monthValue)) && parseInt(monthValue) > 0 && parseInt(monthValue) <= 12;
    
    // Check if amount column (index 3) contains non-numeric data
    const amountValue = String(firstRow[3]);
    const isAmountNumeric = !isNaN(parseFloat(amountValue));
    
    // If month is not numeric or amount is not numeric, likely headers
    return !isMonthNumeric || !isAmountNumeric;
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
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:I1`,
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
}
