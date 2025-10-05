import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const GoogleSheetsConfig: React.FC = () => {
  const { settings, setGoogleSheetsId } = useSettings();
  const { toast } = useToast();
  const [sheetsId, setSheetsId] = useState(settings.googleSheetsId);
  const [isTesting, setIsTesting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleSave = () => {
    setGoogleSheetsId(sheetsId);
    toast({
      title: "Settings Saved",
      description: "Google Sheets ID has been updated.",
    });
  };

  const handleTest = async () => {
    if (!sheetsId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheets ID first.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setIsValid(null);

    try {
      // TODO: Implement actual Google Sheets API test
      // For now, just simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Basic validation - check if it looks like a Google Sheets ID
      const isValidFormat = /^[a-zA-Z0-9-_]{44}$/.test(sheetsId);
      
      if (isValidFormat) {
        setIsValid(true);
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Google Sheets.",
        });
      } else {
        setIsValid(false);
        toast({
          title: "Invalid Format",
          description: "The Google Sheets ID format appears to be invalid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsValid(false);
      toast({
        title: "Connection Failed",
        description: "Could not connect to Google Sheets. Please check the ID.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Sheets Configuration</CardTitle>
        <CardDescription>
          Configure the Google Sheets spreadsheet where transaction data will be uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sheets-id">Google Sheets ID</Label>
          <div className="flex space-x-2">
            <Input
              id="sheets-id"
              placeholder="Enter Google Sheets ID (44 characters)"
              value={sheetsId}
              onChange={(e) => setSheetsId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleTest}
              disabled={isTesting || !sheetsId.trim()}
              variant="outline"
            >
              {isTesting ? "Testing..." : "Test"}
            </Button>
          </div>
          {isValid === true && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Connection successful</span>
            </div>
          )}
          {isValid === false && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Connection failed or invalid format</span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>To find your Google Sheets ID:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Open your Google Sheets document</li>
            <li>Look at the URL: <code>https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code></li>
            <li>Copy the [SHEET_ID] part (44 characters)</li>
          </ol>
        </div>

        <Button onClick={handleSave} disabled={!sheetsId.trim()}>
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
};
