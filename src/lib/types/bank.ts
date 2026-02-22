export enum Bank {
  NORDEA_FI = 'nordea-fi',
  NORDEA_SE = 'nordea-se',
  OP = 'op',
  OP_CREDIT_CARD = 'op-credit-card',
  HANDELSBANKEN = 'handelsbanken',
  NORWEGIAN = 'norwegian',
  BINANCE = 'binance'
}

export interface BankInfo {
  id: Bank;
  name: string;
  sheetName: string;  // Abbreviated name for sheet tabs
  fileTypes: string[];
  delimiter: string | null;
}

// Fixed bank configurations - cannot be changed
export const BANK_CONFIG: Record<Bank, BankInfo> = {
  [Bank.NORDEA_FI]: {
    id: Bank.NORDEA_FI,
    name: 'Nordea Finland',
    sheetName: 'NordeaFI',
    fileTypes: ['.csv'],
    delimiter: ';'
  },
  [Bank.NORWEGIAN]: {
    id: Bank.NORWEGIAN,
    name: 'Bank Norwegian',
    sheetName: 'Norwegian',
    fileTypes: ['.xlsx'],
    delimiter: null
  },
  [Bank.OP]: {
    id: Bank.OP,
    name: 'OP Bank',
    sheetName: 'OP',
    fileTypes: ['.csv'],
    delimiter: ','
  },
  [Bank.OP_CREDIT_CARD]: {
    id: Bank.OP_CREDIT_CARD,
    name: 'OP Credit Card',
    sheetName: 'OPCreditCard',
    fileTypes: ['.xml'],
    delimiter: null
  },
  [Bank.HANDELSBANKEN]: {
    id: Bank.HANDELSBANKEN,
    name: 'Handelsbanken',
    sheetName: 'Handelsbanken',
    fileTypes: ['.csv'],
    delimiter: ','
  },
  [Bank.NORDEA_SE]: {
    id: Bank.NORDEA_SE,
    name: 'Nordea Sweden',
    sheetName: 'NordeaSWE',
    fileTypes: ['.csv'],
    delimiter: ';'
  },
  [Bank.BINANCE]: {
    id: Bank.BINANCE,
    name: 'Binance',
    sheetName: 'Binance',
    fileTypes: ['.csv'],
    delimiter: ','
  }
};

// Helper function to get all available banks
export const getAllBanks = (): BankInfo[] => {
  return Object.values(BANK_CONFIG);
};
