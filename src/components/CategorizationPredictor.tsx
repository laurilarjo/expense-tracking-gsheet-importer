import React, { useState, useEffect } from 'react';
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
  Eye, 
  EyeOff, 
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';
import { MLCategorizationService } from '../lib/services/ml-categorization-service';
import { Transaction } from '../lib/types/transaction';
import { CategorizationResult, CategorizationPrediction } from '../lib/types/categorization';

interface CategorizationPredictorProps {
  transactions: Transaction[];
  onPredictionsUpdate?: (predictions: CategorizationPrediction[]) => void;
  onTransactionUpdate?: (updatedTransactions: Transaction[]) => void;
}

interface PredictionState {
  predictions: CategorizationPrediction[];
  isProcessing: boolean;
  showAllPredictions: boolean;
  confidenceThreshold: number;
}

export const CategorizationPredictor: React.FC<CategorizationPredictorProps> = ({
  transactions,
  onPredictionsUpdate,
  onTransactionUpdate
}) => {
  const [state, setState] = useState<PredictionState>({
    predictions: [],
    isProcessing: false,
    showAllPredictions: false,
    confidenceThreshold: 0.7
  });

  const [modelMetadata, setModelMetadata] = useState<any>(null);
  const mlService = new MLCategorizationService();

  useEffect(() => {
    checkModelAvailability();
  }, []);

  const checkModelAvailability = async () => {
    const isAvailable = await mlService.loadModelFromIndexedDB();
    if (isAvailable) {
      setModelMetadata(mlService.getModelMetadata());
    }
  };

  const generatePredictions = async () => {
    if (!mlService.isModelAvailable()) {
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

  const handleCategoryOverride = (transactionIndex: number, newCategory: string) => {
    const updatedPredictions = [...state.predictions];
    updatedPredictions[transactionIndex] = {
      ...updatedPredictions[transactionIndex],
      result: {
        ...updatedPredictions[transactionIndex].result,
        category: newCategory,
        confidence: 1.0
      },
      isManualOverride: true
    };

    setState(prev => ({ ...prev, predictions: updatedPredictions }));

    // Update the original transaction
    const updatedTransactions = [...transactions];
    updatedTransactions[transactionIndex] = {
      ...updatedTransactions[transactionIndex],
      category: newCategory,
      predictedCategory: newCategory,
      categoryConfidence: 1.0
    };

    if (onTransactionUpdate) {
      onTransactionUpdate(updatedTransactions);
    }
  };

  const applyAllPredictions = () => {
    const updatedTransactions = transactions.map((transaction, index) => {
      const prediction = state.predictions[index];
      if (prediction && prediction.result.confidence >= state.confidenceThreshold) {
        return {
          ...transaction,
          category: prediction.result.category,
          predictedCategory: prediction.result.category,
          categoryConfidence: prediction.result.confidence
        };
      }
      return transaction;
    });

    if (onTransactionUpdate) {
      onTransactionUpdate(updatedTransactions);
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

  const filteredPredictions = state.showAllPredictions 
    ? state.predictions 
    : state.predictions.filter(p => p.result.confidence >= state.confidenceThreshold);

  const highConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.8).length;
  const mediumConfidenceCount = state.predictions.filter(p => p.result.confidence >= 0.6 && p.result.confidence < 0.8).length;
  const lowConfidenceCount = state.predictions.filter(p => p.result.confidence < 0.6).length;

  if (!mlService.isModelAvailable()) {
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
              <>
                <Button 
                  onClick={() => setState(prev => ({ ...prev, showAllPredictions: !prev.showAllPredictions }))}
                  variant="outline"
                >
                  {state.showAllPredictions ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Low Confidence
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show All Predictions
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={applyAllPredictions}
                  variant="outline"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply All High Confidence
                </Button>
              </>
            )}
          </div>

          {/* Confidence Threshold Slider */}
          {state.predictions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Confidence Threshold: {Math.round(state.confidenceThreshold * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={state.confidenceThreshold}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  confidenceThreshold: parseFloat(e.target.value) 
                }))}
                className="w-full"
              />
            </div>
          )}
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
                <div className="text-sm text-muted-foreground">Low Confidence (under 60%)</div>
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
                <div key={originalIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{transaction.payee}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.date} • {transaction.amountEur.toFixed(2)} €
                      </div>
                      {transaction.message && (
                        <div className="text-sm text-muted-foreground italic">
                          "{transaction.message}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getConfidenceBadgeVariant(result.confidence)}>
                        {Math.round(result.confidence * 100)}%
                      </Badge>
                      {prediction.isManualOverride && (
                        <Badge variant="outline" className="text-xs">
                          Manual
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Predicted Category:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {result.category}
                      </Badge>
                    </div>

                    {result.alternatives.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Alternatives:</span>
                        <div className="flex flex-wrap gap-1">
                          {result.alternatives.map((alt, altIndex) => (
                            <Badge key={altIndex} variant="outline" className="text-xs">
                              {alt.category} ({Math.round(alt.confidence * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCategoryOverride(originalIndex, result.category)}
                        disabled={prediction.isManualOverride}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newCategory = prompt('Enter new category:', result.category);
                          if (newCategory) {
                            handleCategoryOverride(originalIndex, newCategory);
                          }
                        }}
                      >
                        Override
                      </Button>
                    </div>
                  </div>
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
