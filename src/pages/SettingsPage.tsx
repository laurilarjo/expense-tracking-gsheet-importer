import React from 'react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { GoogleSheetsConfig } from '@/components/Settings/GoogleSheetsConfig';
import { UserManager } from '@/components/Settings/UserManager';
import { ExchangeRateConfig } from '@/components/Settings/ExchangeRateConfig';
import { CategorizationTrainer } from '@/components/CategorizationTrainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationBar } from '@/components/NavigationBar';
import { Settings, Users, FileSpreadsheet } from 'lucide-react';

const SettingsPageContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <NavigationBar />
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter">Settings</h1>
          </div>
        {/* Quick Start Guide */}
        <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tighter flex items-center justify-center space-x-2">
              <FileSpreadsheet className="h-6 w-6" />
              <span>Quick Start Guide</span>
            </h2>
            <p className="text-muted-foreground">
              Follow these steps to get started with the expense tracker.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Configure Google Sheets</h4>
                <p className="text-sm text-muted-foreground">
                  Enter your Google Sheets ID above and test the connection.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Add Users</h4>
                <p className="text-sm text-muted-foreground">
                  Add users and assign which banks they can use for file uploads.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Upload Files</h4>
                <p className="text-sm text-muted-foreground">
                  Go to the main page and upload bank statement files for processing.
                </p>
              </div>
            </div>
          </div>
        </Card>
        {/* Google Sheets Configuration */}
        <GoogleSheetsConfig />

        {/* Exchange Rate Configuration */}
        <ExchangeRateConfig />

        {/* User Management */}
        <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tighter">User Management</h2>
            <p className="text-muted-foreground">
              Manage users and assign which banks they can use for file uploads.
            </p>
          </div>
          <UserManager />
        </Card>

        {/* ML Categorization Training */}
        <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tighter">ML Categorization Training</h2>
            <p className="text-muted-foreground">
              Train a machine learning model to automatically categorize your transactions.
            </p>
          </div>
          <CategorizationTrainer 
            accessToken={localStorage.getItem("google_sheets_token") ? JSON.parse(localStorage.getItem("google_sheets_token")!).token : ""}
            onTrainingComplete={(metadata) => {
              console.log('ML model training completed:', metadata);
            }}
          />
        </Card>
        </div>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  return (
    <SettingsProvider>
      <SettingsPageContent />
    </SettingsProvider>
  );
};
