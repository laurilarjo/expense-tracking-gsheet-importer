import { Transaction } from './transaction';

export interface CategorizationResult {
  category: string;
  confidence: number;
  alternatives: Array<{
    category: string;
    confidence: number;
  }>;
}

export interface TrainingData {
  transactions: Transaction[];
  categories: string[];
  totalCount: number;
  categoryCounts: Record<string, number>;
}

export interface ModelMetadata {
  version: string;
  trainingDate: Date;
  accuracy: number;
  categories: string[];
  transactionCount: number;
  validationAccuracy: number;
}

export interface CategorizationPrediction {
  transaction: Transaction;
  result: CategorizationResult;
  isManualOverride: boolean;
}
