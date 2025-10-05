import React, { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Key, ExternalLink, TestTube, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { testExchangeRateApi } from '@/lib/services/exchange-rate-service';

export const ExchangeRateConfig: React.FC = () => {
  const { settings, setExchangeratesApiKey } = useSettings();
  const [apiKey, setApiKey] = useState(settings.exchangeratesApiKey || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setExchangeratesApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'Exchange rate API key saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsLoading(false);
    }
  };


  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setIsValid(null);
    
    try {
      const result = await testExchangeRateApi(apiKey);
      
      if (result.success) {
        setIsValid(true);
        toast({
          title: "API Test Successful!",
          description: `EUR to SEK rate for ${result.date}: 1 EUR = ${result.rate?.toFixed(4)} SEK`,
          variant: "default",
        });
      } else {
        setIsValid(false);
        toast({
          title: "API Test Failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing API:', error);
      setIsValid(false);
      toast({
        title: "API Test Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-6 w-6" />
          <CardTitle>Exchange Rate Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure exchange rate API for currency conversion (required for Handelsbanken SEK transactions).
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="exchange-api-key" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Exchange Rates API Key</span>
          </Label>
          <div className="flex space-x-2">
            <Input
              id="exchange-api-key"
              type="text"
              placeholder="Enter your exchangerates.io API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleTest}
              disabled={isTesting || !apiKey.trim()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <TestTube className="h-4 w-4" />
              <span>{isTesting ? 'Testing...' : 'Test'}</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Get your free API key from{' '}
            <a 
              href="https://exchangerates.io/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center space-x-1"
            >
              <span>exchangerates.io</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          {isValid === true && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Connection successful</span>
            </div>
          )}
          {isValid === false && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Connection failed or invalid API key</span>
            </div>
          )}
        </div>

        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isLoading || !apiKey.trim()}
          className="w-full"
        >
          {isLoading ? 'Saving...' : 'Save API Key'}
        </Button>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Why is this needed?</strong></p>
          <p>
            Handelsbanken transactions are in Swedish Krona (SEK). This API key is used to convert 
            SEK amounts to EUR for consistent reporting in your Google Sheets.
          </p>
          <p>
            <strong>Note:</strong> The API key is stored locally in your browser and only used for 
            currency conversion. No transaction data is sent to external services.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
