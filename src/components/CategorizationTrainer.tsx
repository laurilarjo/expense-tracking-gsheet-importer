import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Loader2, CheckCircle, AlertCircle, Brain, Database, BarChart3 } from 'lucide-react';
import { GoogleSheetsService } from '../lib/services/google-sheets-service';
import { MLCategorizationService } from '../lib/services/ml-categorization-service';
import { Transaction } from '../lib/types/transaction';
import { ModelMetadata } from '../lib/types/categorization';
import { generateUserSheetNames } from '../lib/utils/sheet-naming';
import { useSettings } from '../contexts/SettingsContext';

interface CategorizationTrainerProps {
  accessToken: string;
  onTrainingComplete?: (metadata: ModelMetadata) => void;
}

interface TrainingProgress {
  stage: 'idle' | 'validating' | 'fetching' | 'training' | 'saving' | 'complete' | 'error';
  message: string;
  progress: number;
}

interface DataSource {
  url: string;
  isValid: boolean;
  isAccessible: boolean;
  transactionCount: number;
  categoryCount: number;
  categories: string[];
}

export const CategorizationTrainer: React.FC<CategorizationTrainerProps> = ({
  accessToken,
  onTrainingComplete
}) => {
  const { settings } = useSettings();
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [progress, setProgress] = useState<TrainingProgress>({
    stage: 'idle',
    message: '',
    progress: 0
  });
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [combinedData, setCombinedData] = useState<{
    totalTransactions: number;
    totalCategories: number;
    categories: string[];
  } | null>(null);
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);

  const sheetsService = GoogleSheetsService.getInstance();
  const mlService = new MLCategorizationService();

  // Get all valid sheet names from all users
  const getAllValidSheetNames = (): string[] => {
    const allSheetNames: string[] = [];
    settings.users.forEach(user => {
      const userSheetNames = generateUserSheetNames(user.name, user.allowedBanks);
      allSheetNames.push(...userSheetNames);
    });
    return [...new Set(allSheetNames)]; // Remove duplicates
  };

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'docs.google.com' && 
             urlObj.pathname.includes('/spreadsheets/d/');
    } catch {
      return false;
    }
  };

  const validateUrls = async () => {
    setProgress({ stage: 'validating', message: 'Validating Google Sheets URLs...', progress: 10 });
    
    const sources: DataSource[] = [];
    
    // Validate URL 1
    if (url1.trim()) {
      const isValid = validateUrl(url1);
      let isAccessible = false;
      let transactionCount = 0;
      let categoryCount = 0;
      let categories: string[] = [];

      if (isValid) {
        try {
          isAccessible = await sheetsService.validateGoogleSheetsAccess(url1, accessToken);
          if (isAccessible) {
            const validSheetNames = getAllValidSheetNames();
            const transactions = await sheetsService.getHistoricalTransactionsWithCategories(url1, accessToken, validSheetNames);
            transactionCount = transactions.length;
            categories = [...new Set(transactions.map(t => t.category!).filter(Boolean))];
            categoryCount = categories.length;
          }
        } catch (error) {
          console.error('Error validating URL 1:', error);
        }
      }

      sources.push({
        url: url1,
        isValid,
        isAccessible,
        transactionCount,
        categoryCount,
        categories
      });
    }

    // Validate URL 2
    if (url2.trim()) {
      const isValid = validateUrl(url2);
      let isAccessible = false;
      let transactionCount = 0;
      let categoryCount = 0;
      let categories: string[] = [];

      if (isValid) {
        try {
          isAccessible = await sheetsService.validateGoogleSheetsAccess(url2, accessToken);
          if (isAccessible) {
            const validSheetNames = getAllValidSheetNames();
            const transactions = await sheetsService.getHistoricalTransactionsWithCategories(url2, accessToken, validSheetNames);
            transactionCount = transactions.length;
            categories = [...new Set(transactions.map(t => t.category!).filter(Boolean))];
            categoryCount = categories.length;
          }
        } catch (error) {
          console.error('Error validating URL 2:', error);
        }
      }

      sources.push({
        url: url2,
        isValid,
        isAccessible,
        transactionCount,
        categoryCount,
        categories
      });
    }

    setDataSources(sources);

    // Calculate combined data
    if (sources.length > 0) {
      const allCategories = [...new Set(sources.flatMap(s => s.categories))];
      const totalTransactions = sources.reduce((sum, s) => sum + s.transactionCount, 0);
      
      setCombinedData({
        totalTransactions,
        totalCategories: allCategories.length,
        categories: allCategories
      });
    }

    setProgress({ stage: 'idle', message: '', progress: 0 });
  };

  const startTraining = async () => {
    if (dataSources.length === 0) {
      setProgress({ stage: 'error', message: 'No valid data sources available', progress: 0 });
      return;
    }

    try {
      setProgress({ stage: 'fetching', message: 'Fetching training data...', progress: 20 });
      
      // Fetch all transactions
      const urls = dataSources.filter(s => s.isAccessible).map(s => s.url);
      const validSheetNames = getAllValidSheetNames();
      const allTransactions = await sheetsService.fetchTransactionsFromMultipleSheets(urls, accessToken, validSheetNames);
      
      if (allTransactions.length === 0) {
        throw new Error('No training data found');
      }

      setProgress({ stage: 'training', message: 'Training ML model...', progress: 50 });
      
      // Train the model
      const metadata = await mlService.trainModel(allTransactions, combinedData!.categories);
      setModelMetadata(metadata);

      setProgress({ stage: 'saving', message: 'Saving model...', progress: 90 });
      
      // Save the model
      await mlService.saveModelToIndexedDB();
      
      setProgress({ stage: 'complete', message: 'Training completed successfully!', progress: 100 });
      
      if (onTrainingComplete) {
        onTrainingComplete(metadata);
      }
    } catch (error) {
      console.error('Training failed:', error);
      setProgress({ stage: 'error', message: `Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`, progress: 0 });
    }
  };

  const canStartTraining = dataSources.length > 0 && 
                          dataSources.every(s => s.isValid && s.isAccessible) &&
                          combinedData && combinedData.totalTransactions > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Model Training
          </CardTitle>
          <CardDescription>
            Train a machine learning model using your historical transaction data with categories.
            Provide URLs to Google Sheets containing categorized transactions.
            <br />
            <span className="text-sm text-muted-foreground">
              Only sheets matching configured user names will be read: {getAllValidSheetNames().join(', ')}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url1">Google Sheets URL 1</Label>
              <Input
                id="url1"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                disabled={progress.stage !== 'idle'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url2">Google Sheets URL 2 (Optional)</Label>
              <Input
                id="url2"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                disabled={progress.stage !== 'idle'}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={validateUrls} 
              disabled={progress.stage !== 'idle' || (!url1.trim() && !url2.trim())}
              variant="outline"
            >
              Validate URLs
            </Button>
            <Button 
              onClick={startTraining} 
              disabled={!canStartTraining || progress.stage !== 'idle'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {progress.stage === 'training' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Start Training
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {progress.stage !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progress.message}</span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Sources Summary */}
      {dataSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataSources.map((source, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Source {index + 1}</span>
                  <div className="flex items-center gap-2">
                    {source.isValid && source.isAccessible ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid & Accessible
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {!source.isValid ? 'Invalid URL' : 'Not Accessible'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Transactions: {source.transactionCount}</p>
                  <p>Categories: {source.categoryCount}</p>
                  {source.categories.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Categories:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {source.categories.map(category => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {index < dataSources.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Combined Data Summary */}
      {combinedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Combined Training Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{combinedData.totalTransactions}</div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{combinedData.totalCategories}</div>
                <div className="text-sm text-muted-foreground">Unique Categories</div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">All Categories:</p>
              <div className="flex flex-wrap gap-1">
                {combinedData.categories.map(category => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Results */}
      {modelMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Training Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(modelMetadata.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Model Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{modelMetadata.transactionCount}</div>
                <div className="text-sm text-muted-foreground">Training Samples</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Model trained on {modelMetadata.transactionCount} transactions with {modelMetadata.categories.length} categories.</p>
              <p>Training completed on {new Date(modelMetadata.trainingDate).toLocaleString()}.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {progress.stage === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{progress.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
