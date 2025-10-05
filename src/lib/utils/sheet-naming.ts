import { Bank } from '../types/bank';
import { BANK_CONFIG } from '../types/bank';

/**
 * Generates a sheet name from user name and bank
 * Format: "UserName BankSheetName"
 * Examples:
 * - "Lauri" + Bank.NORDEA_FI → "Lauri NordeaFI"
 * - "Becky" + Bank.NORWEGIAN → "Becky Norwegian"
 */
export const generateSheetName = (userName: string, bank: Bank): string => {
  const bankInfo = BANK_CONFIG[bank];
  return `${userName} ${bankInfo.sheetName}`;
};

/**
 * Generates all possible sheet names for a user based on their allowed banks
 */
export const generateUserSheetNames = (userName: string, allowedBanks: Bank[]): string[] => {
  return allowedBanks.map(bank => generateSheetName(userName, bank));
};
