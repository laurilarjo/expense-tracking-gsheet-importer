import { CategorizationPrediction } from '../types/categorization';
import { Transaction } from '../types/transaction';

export function applyHighConfidenceCategories(
  transactions: Transaction[],
  predictions: CategorizationPrediction[]
): Transaction[] {
  return transactions.map((transaction, index) => {
    const prediction = predictions[index];
    if (prediction && prediction.result.confidence >= 0.8) {
      return {
        ...transaction,
        category: prediction.result.category,
        predictedCategory: prediction.result.category,
        categoryConfidence: prediction.result.confidence
      };
    }
    return {
      ...transaction,
      category: undefined,
      predictedCategory: undefined,
      categoryConfidence: undefined
    };
  });
}
