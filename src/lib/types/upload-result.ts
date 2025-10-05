import { Transaction } from './transaction';

export interface UploadResult {
  success: boolean;
  existingTransactionsCount: number;
  fileTransactionsCount: number;
  newTransactionsCount: number;
  writtenTransactionsCount: number;
  newTransactions: Transaction[];
  error?: string;
}

export interface UploadSummary {
  fileName: string;
  bankName: string;
  result: UploadResult;
  timestamp: Date;
}
