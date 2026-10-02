import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { 
  Brain, 
  AlertCircle, 
  Loader2, 
  Target,
  TrendingUp
} from 'lucide-react';
import { MLCategorizationService } from '../lib/services/ml-categorization-service';
import { Transaction } from '../lib/types/transaction';
import { CategorizationPrediction, ModelMetadata } from '../lib/types/categorization';

interface CategorizationPredictorProps {
  transactions: Transaction[];
  /** Change this when a new file is loaded to clear prior predictions. */
  resetKey?: string;
  onPredictionsUpdate?: (predictions: CategorizationPrediction[]) => void;
  onTransactionUpdate?: (updatedTransactions: Transaction[]) => void;
}

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

interface PredictionState {
  predictions: CategorizationPrediction[];
  isProcessing: boolean;
}

export const CategorizationPredictor: React.FC<CategorizationPredictorProps> = ({
  transactions,
  resetKey,
  onPredictionsUpdate,
  onTransactionUpdate,
}) => {
  const [state, setState] = useState<PredictionState>({
    predictions: [],
    isProcessing: false
  });

  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const mlService = useMemo(() => new MLCategorizationService(), []);

  const checkModelAvailability = useCallback(async () => {
    const isAvailable = await mlService.loadModelFromIndexedDB();
    if (isAvailable) {
      setModelMetadata(mlService.getModelMetadata());
      setIsModelLoaded(true);
      console.log('✅ Model loaded successfully in CategorizationPredictor');
    } else {
      setIsModelLoaded(false);
      console.log('❌ No model found in IndexedDB');
    }
  }, [mlService]);

  useEffect(() => {
    checkModelAvailability();
  }, [checkModelAvailability]);

  // Reset predictions when a new file session starts
  useEffect(() => {
    setState({ predictions: [], isProcessing: false });
    onPredictionsUpdate?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const generatePredictions = async () => {
    if (!isModelLoaded || transactions.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const predictions: CategorizationPrediction[] = [];

      for (const transaction of transactions) {
        try {
          const result = await mlService.predictCategory(transaction);
          predictions.push({
            transaction,
            result,
            isManualOverride: false
          });
        } catch (error) {
          console.error('Error predicting category for transaction:', error);
          predictions.push({
            transaction,
            result: {
              category: 'Other',
              confidence: 0.1,
              alternatives: []
            },
            isManualOverride: false
          });
        }
      }

      setState({ predictions, isProcessing: false });
      onPredictionsUpdate?.(predictions);

      const categorized = applyHighConfidenceCategories(transactions, predictions);
      onTransactionUpdate?.(categorized);
    } catch (error) {
      console.error('Error generating predictions:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  const highConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.8).length;
  const mediumConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.6 && p.result.confidence < 0.8).length;
  const lowConfidenceCount = state.predictions.filter(p => p.result.confidence < 0.6).length;

  if (transactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6">
        <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Upload a bank file first to categorize transactions.</p>
      </div>
    );
  }

  if (!isModelLoaded) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No trained model available. Train a model in Settings first, then generate predictions here.
          {modelMetadata && (
            <span className="block mt-1 text-sm">
              Model accuracy: {(modelMetadata.accuracy * 100).toFixed(1)}%
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {modelMetadata && (
        <p className="text-sm text-muted-foreground">
          Model accuracy: {(modelMetadata.accuracy * 100).toFixed(1)}% · Trained on {modelMetadata.transactionCount} transactions
        </p>
      )}

      <Button 
        onClick={generatePredictions} 
        disabled={state.isProcessing || transactions.length === 0}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {state.isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 mr-2" />
            Generate Predictions
          </>
        )}
      </Button>

      {state.predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Prediction Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{highConfidenceCount}</div>
                <div className="text-sm text-muted-foreground">High Confidence (≥80%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{mediumConfidenceCount}</div>
                <div className="text-sm text-muted-foreground">Medium Confidence (60-79%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lowConfidenceCount}</div>
                <div className="text-sm text-muted-foreground">Low Confidence (&lt;60%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {state.predictions.length > 0 && (
        <Accordion type="single" collapsible className="rounded-lg border px-4">
          <AccordionItem value="predictions" className="border-b-0">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Target className="h-5 w-5" />
                Categorization Predictions
                <span className="text-sm font-normal text-muted-foreground">
                  ({state.predictions.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {state.predictions.map((prediction, index) => {
                const transaction = prediction.transaction;
                const result = prediction.result;
                
                return (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{transaction.payee}</span>
                          <span className="text-sm text-muted-foreground">
                            {transaction.date} • {transaction.amountEur.toFixed(2)} €
                          </span>
                        </div>
                        {transaction.message && (
                          <div className="text-xs text-muted-foreground truncate">
                            "{transaction.message}"
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={getConfidenceBadgeVariant(result.confidence)} className="text-xs">
                          {Math.round(result.confidence * 100)}%
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          {result.category}
                        </Badge>
                      </div>
                    </div>

                    {result.alternatives.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Alternatives:</span>
                        <div className="flex flex-wrap gap-1">
                          {result.alternatives.slice(0, 2).map((alt, altIndex) => (
                            <Badge key={altIndex} variant="outline" className="text-xs">
                              {alt.category} ({Math.round(alt.confidence * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {state.predictions.length === 0 && !state.isProcessing && (
        <div className="text-center text-muted-foreground py-4">
          <p>No predictions generated yet. Click "Generate Predictions" to start.</p>
        </div>
      )}
    </div>
  );
};
