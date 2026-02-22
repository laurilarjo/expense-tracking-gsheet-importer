import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NavigationBar } from '@/components/NavigationBar';
import { Building2, Shield, Database, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Bank } from '@/lib/types/bank';

const AboutPage: React.FC = () => {
  const supportedBanks = [
    { bank: Bank.OP, name: 'OP Bank', tested: true },
    { bank: Bank.NORDEA_FI, name: 'Nordea Finland', tested: true },
    { bank: Bank.NORWEGIAN, name: 'Norwegian Bank', tested: true },
    { bank: Bank.BINANCE, name: 'Binance', tested: false },
    { bank: Bank.HANDELSBANKEN, name: 'Handelsbanken', tested: false },
    { bank: Bank.NORDEA_SE, name: 'Nordea Sweden', tested: false },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      <NavigationBar />
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter">About</h1>
            <p className="text-muted-foreground mt-2">
              Google Sheets Expense Tracker
            </p>
          </div>

          {/* Privacy & Security */}
          <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-green-600" />
                <CardTitle>Privacy & Security</CardTitle>
              </div>
              <CardDescription>
                Your data privacy and security are our top priorities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">No Third-Party Data Sharing</h4>
                    <p className="text-sm text-green-700 mt-1">
                      This application does not send your transaction data to any third parties, 
                      including our own backend servers. All data processing happens locally in your browser.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Database className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Direct to Your Google Sheets</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      All transaction data goes directly from your browser to your own Google Sheets. 
                      We never store or access your financial information.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Banks */}
          <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <CardTitle>Supported Banks</CardTitle>
              </div>
              <CardDescription>
                Supported transaction file uploads from the following banks and financial institutions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportedBanks.map(({ bank, name, tested }) => (
                  <div key={bank} className="flex items-center space-x-3 p-3 border rounded-lg">
                    {tested ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <h4 className="font-medium">{name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tested ? 'Recently tested and verified' : 'Not recently tested - may need updates'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>              
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>
                What makes this expense tracker special.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Multi-Bank Support</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Support for 6 different banks and financial institutions</li>
                    <li>• Automatic bank detection and parsing</li>
                    <li>• Multiple file format support (CSV, XLSX)</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Currency Conversion</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Automatic SEK to EUR conversion for Swedish banks</li>
                    <li>• Real-time exchange rates from exchangerates.io</li>
                    <li>• Historical rate caching for efficiency</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Google Sheets Integration</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Direct upload to your Google Sheets</li>
                    <li>• Automatic duplicate detection</li>
                    <li>• Detailed upload summaries and statistics</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Privacy & Security</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• 100% local processing - no data leaves your browser</li>
                    <li>• No third-party data sharing</li>
                    <li>• Direct connection to your Google Sheets only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
