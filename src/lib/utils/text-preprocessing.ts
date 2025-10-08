import { Transaction } from '../types/transaction';

/**
 * Text preprocessing utilities for machine learning categorization
 */

export interface TextFeatures {
  payeeNormalized: string;
  messageNormalized: string;
  combinedText: string;
  payeeTokens: string[];
  messageTokens: string[];
  allTokens: string[];
}

/**
 * Normalize text by removing special characters, converting to lowercase, and handling common variations
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Remove common special characters but keep spaces and basic punctuation
    .replace(/[^\w\s\-\.]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove leading/trailing spaces
    .trim();
}

/**
 * Extract tokens from text for feature extraction
 */
export function tokenizeText(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 0)
    .filter(token => token.length > 1); // Remove single character tokens
}

/**
 * Extract features from a transaction for ML training/prediction
 */
export function extractTextFeatures(transaction: Transaction): TextFeatures {
  const payeeNormalized = normalizeText(transaction.payee);
  const messageNormalized = normalizeText(transaction.message);
  const combinedText = `${payeeNormalized} ${messageNormalized}`.trim();
  
  const payeeTokens = tokenizeText(transaction.payee);
  const messageTokens = tokenizeText(transaction.message);
  const allTokens = [...payeeTokens, ...messageTokens];
  
  return {
    payeeNormalized,
    messageNormalized,
    combinedText,
    payeeTokens,
    messageTokens,
    allTokens
  };
}

/**
 * Create a vocabulary from a list of transactions
 */
export function createVocabulary(transactions: Transaction[]): string[] {
  const allTokens = new Set<string>();
  
  transactions.forEach(transaction => {
    const features = extractTextFeatures(transaction);
    features.allTokens.forEach(token => allTokens.add(token));
  });
  
  return Array.from(allTokens).sort();
}

/**
 * Convert text features to numerical vector using vocabulary
 */
export function textToVector(text: string, vocabulary: string[]): number[] {
  const tokens = tokenizeText(text);
  const vector = new Array(vocabulary.length).fill(0);
  
  tokens.forEach(token => {
    const index = vocabulary.indexOf(token);
    if (index !== -1) {
      vector[index] = 1; // Binary encoding for simplicity
    }
  });
  
  return vector;
}

/**
 * Create numerical features from transaction for ML model
 */
export function createNumericalFeatures(
  transaction: Transaction, 
  vocabulary: string[]
): number[] {
  const features = extractTextFeatures(transaction);
  
  // Text features (binary encoding)
  const textVector = textToVector(features.combinedText, vocabulary);
  
  // Numerical features
  const amount = transaction.amount;
  const amountEur = transaction.amountEur;
  const month = transaction.month;
  const year = transaction.year;
  
  // Normalize numerical features
  const normalizedAmount = Math.log(Math.abs(amount) + 1) * Math.sign(amount);
  const normalizedAmountEur = Math.log(Math.abs(amountEur) + 1) * Math.sign(amountEur);
  const normalizedMonth = (month - 1) / 11; // Normalize to 0-1
  const normalizedYear = (year - 2020) / 10; // Normalize relative to 2020
  
  return [
    ...textVector,
    normalizedAmount,
    normalizedAmountEur,
    normalizedMonth,
    normalizedYear
  ];
}

/**
 * Handle multi-language text normalization
 */
export function normalizeMultiLanguageText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Handle Finnish/Swedish specific characters
    .replace(/[äå]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/[ß]/g, 'ss')
    // Remove common prefixes/suffixes
    .replace(/^(mr|mrs|ms|dr|prof)\s+/g, '')
    .replace(/\s+(ltd|inc|corp|llc|ab|oy|as)$/g, '')
    // Remove common transaction prefixes
    .replace(/^(payment|transfer|withdrawal|deposit|refund)\s+/g, '')
    // Remove common suffixes
    .replace(/\s+(payment|transfer|withdrawal|deposit|refund)$/g, '')
    // Remove numbers at the end (reference numbers)
    .replace(/\s+\d+$/, '')
    // Final cleanup
    .replace(/[^\w\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful keywords from transaction text
 */
export function extractKeywords(transaction: Transaction): string[] {
  const payee = normalizeMultiLanguageText(transaction.payee);
  const message = normalizeMultiLanguageText(transaction.message);
  const combined = `${payee} ${message}`.trim();
  
  const tokens = tokenizeText(combined);
  
  // Filter out common stop words
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'ja', 'tai', 'mutta', 'ja', 'tai', 'mutta', 'ja', 'tai', 'mutta', // Finnish
    'och', 'eller', 'men', 'och', 'eller', 'men' // Swedish
  ]);
  
  return tokens.filter(token => 
    token.length > 2 && 
    !stopWords.has(token) &&
    !/^\d+$/.test(token) // Remove pure numbers
  );
}
