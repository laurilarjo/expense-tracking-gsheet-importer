import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Target,
  TrendingUp
} from 'lucide-react';
import { MLCategorizationService } from '../lib/services/ml-categorization-service';
import { Transaction } from '../lib/types/transaction';
import { CategorizationResult, CategorizationPrediction, ModelMetadata } from '../lib/types/categorization';

interface CategorizationPredictorProps {
  transactions: Transaction[];
  onPredictionsUpdate?: (predictions: CategorizationPrediction[]) => void;
  onTransactionUpdate?: (updatedTransactions: Transaction[]) => void;
  onUploadToSheets?: (categorizedTransactions: Transaction[]) => void;
  isUploading?: boolean;
}

interface PredictionState {
  predictions: CategorizationPrediction[];
  isProcessing: boolean;
}

export const CategorizationPredictor: React.FC<CategorizationPredictorProps> = ({
  transactions,
  onPredictionsUpdate,
  onTransactionUpdate,
  onUploadToSheets,
  isUploading = false
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

  const generatePredictions = async () => {
    if (!isModelLoaded) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false 
      }));
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
          // Add fallback prediction
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

      setState(prev => ({ 
        ...prev, 
        predictions, 
        isProcessing: false 
      }));

      if (onPredictionsUpdate) {
        onPredictionsUpdate(predictions);
      }
    } catch (error) {
      console.error('Error generating predictions:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false 
      }));
    }
  };


  const applyAllPredictions = () => {
    const updatedTransactions = transactions.map((transaction, index) => {
      const prediction = state.predictions[index];
      if (prediction && prediction.result.confidence >= 0.8) {
        return {
          ...transaction,
          category: prediction.result.category,
          predictedCategory: prediction.result.category,
          categoryConfidence: prediction.result.confidence
        };
      }
      // For low confidence predictions, leave category empty
      return {
        ...transaction,
        category: undefined,
        predictedCategory: undefined,
        categoryConfidence: undefined
      };
    });

    if (onTransactionUpdate) {
      onTransactionUpdate(updatedTransactions);
    }
  };

  const handleUploadWithCategorization = () => {
    // Apply categories to transactions
    const categorizedTransactions = transactions.map((transaction, index) => {
      const prediction = state.predictions[index];
      if (prediction && prediction.result.confidence >= 0.8) {
        return {
          ...transaction,
          category: prediction.result.category,
          predictedCategory: prediction.result.category,
          categoryConfidence: prediction.result.confidence
        };
      }
      // For low confidence predictions, leave category empty
      return {
        ...transaction,
        category: undefined,
        predictedCategory: undefined,
        categoryConfidence: undefined
      };
    });

    // Update the transactions with categories
    if (onTransactionUpdate) {
      onTransactionUpdate(categorizedTransactions);
    }
    
    // Upload with the categorized transactions
    if (onUploadToSheets) {
      onUploadToSheets(categorizedTransactions);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  const filteredPredictions = state.predictions;

  const highConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.8).length;
  const mediumConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.6 && p.result.confidence < 0.8).length;
  const lowConfidenceCount = state.predictions.filter(p => p.result.confidence < 0.6).length;

  if (!isModelLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Categorization
          </CardTitle>
          <CardDescription>
            No trained model available. Please train a model first using the Categorization Trainer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To use automatic categorization, you need to train a machine learning model first.
              Go to the Settings page to train your model.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Categorization
          </CardTitle>
          <CardDescription>
            Automatically categorize transactions using your trained ML model.
            {modelMetadata && (
              <span className="block mt-1 text-sm">
                Model accuracy: {(modelMetadata.accuracy * 100).toFixed(1)}% | 
                Trained on {modelMetadata.transactionCount} transactions
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
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
              <Button 
                onClick={handleUploadWithCategorization}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Upload to Google Sheets
                  </>
                )}
              </Button>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Prediction Statistics */}
      {state.predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

      {/* Predictions List */}
      {filteredPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Categorization Predictions
            </CardTitle>
            <CardDescription>
              Showing {filteredPredictions.length} of {state.predictions.length} predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredPredictions.map((prediction, index) => {
              const originalIndex = state.predictions.indexOf(prediction);
              const transaction = prediction.transaction;
              const result = prediction.result;
              
              return (
                <div key={originalIndex} className="border rounded-lg p-3 space-y-2">
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
                    <div className="flex items-center gap-2 flex-shrink-0">
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
          </CardContent>
        </Card>
      )}

      {/* No Predictions Message */}
      {state.predictions.length === 0 && !state.isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No predictions generated yet. Click "Generate Predictions" to start.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
