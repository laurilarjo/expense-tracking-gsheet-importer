import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSheetsReader } from '@/components/GoogleSheetsReader';
import { NavigationBar } from '@/components/NavigationBar';
import { Code, Key, ExternalLink, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DevModePage: React.FC = () => {
  const [devToken, setDevToken] = useState('');
  const [tokenSetSuccessfully, setTokenSetSuccessfully] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Check if there's a valid token on component mount
  useEffect(() => {
    const checkToken = () => {
      try {
        const tokenData = localStorage.getItem("google_sheets_token");
        if (tokenData) {
          const { token, expiresAt } = JSON.parse(tokenData);
          if (token && expiresAt && Date.now() < expiresAt) {
            setTokenSetSuccessfully(true);
            const remaining = Math.floor((expiresAt - Date.now()) / 1000);
            setTimeRemaining(remaining);
          }
        }
      } catch (error) {
        console.error("Error checking token:", error);
      }
    };

    checkToken();
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    if (!tokenSetSuccessfully || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          setTokenSetSuccessfully(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenSetSuccessfully, timeRemaining]);

  const handleSetDevToken = () => {
    if (!devToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter a valid access token",
        variant: "destructive",
      });
      return;
    }

    try {
      // For manual tokens, we can't determine the actual expiration time
      // Use a reasonable default (1 hour) since Google tokens typically last 1 hour
      const tokenData = {
        access_token: devToken.trim(),
        expires_in: 3600 // 1 hour default
      };
      
      localStorage.setItem("google_sheets_token", JSON.stringify({
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      }));
      
      toast({
        title: "Development Token Set",
        description: "Token has been stored successfully. Using 1 hour default expiration.",
      });
      
      setTokenSetSuccessfully(true);
      setTimeRemaining(tokenData.expires_in);
      setDevToken('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to store the token. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveToken = () => {
    try {
      localStorage.removeItem("google_sheets_token");
      setTokenSetSuccessfully(false);
      setTimeRemaining(null);
      setDevToken('');
      
      toast({
        title: "Token Removed",
        description: "Development token has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove the token. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <NavigationBar />
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter flex items-center justify-center space-x-2">
              <Code className="h-8 w-8" />
              <span>Developer Mode</span>
            </h1>
          </div>

          {/* Development Token Input */}
          <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tighter flex items-center justify-center space-x-2">
                <Key className="h-6 w-6" />
                <span>Development Token</span>
              </h2>
              <p className="text-muted-foreground">
                Set a manual access token for testing and development
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How to get an access token:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                    OAuth 2.0 Playground <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>Click the gear icon (⚙️) in the top right</li>
                  <li>Select <strong>OAuth flow: Client-side</strong></li>
                  <li>In the left panel, find <strong>Google Sheets API v4</strong></li>
                  <li>Select <code className="bg-blue-100 px-1 rounded">https://www.googleapis.com/auth/spreadsheets</code></li>
                  <li>Click <strong>"Authorize APIs"</strong> and sign in</li>
                  <li>Click <strong>"Step 1's result: Access token retrieved"</strong></li>
                  <li>Copy the <code className="bg-blue-100 px-1 rounded">access_token</code> from the response</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dev-token">Access Token</Label>
                <div className="flex space-x-2">
                  <Input
                    id="dev-token"
                    type="text"
                    placeholder="Paste your access token here..."
                    value={devToken}
                    onChange={(e) => setDevToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSetDevToken} disabled={!devToken.trim()}>
                    Set Token
                  </Button>
                </div>
              </div>
              
              {tokenSetSuccessfully && (
                <div className="flex justify-center">
                  <Button 
                    onClick={handleRemoveToken}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Token
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Success Banner */}
          {tokenSetSuccessfully && (
            <div className="flex items-center justify-center gap-2 bg-green-50 p-4 rounded-md text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Successfully connected to Google Sheets!</span>
              {timeRemaining !== null && (
                <span className="ml-2 text-sm font-mono bg-green-100 px-2 py-1 rounded">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining
                </span>
              )}
            </div>
          )}

          {/* Google Sheets Reader */}
          <GoogleSheetsReader />

          {/* Additional Dev Tools */}
          <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tighter">Additional Development Tools</h2>
              <p className="text-muted-foreground">
                More development and debugging tools will be added here as needed.
              </p>
            </div>
            <div className="text-center text-muted-foreground py-8">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>More development tools coming soon...</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DevModePage;