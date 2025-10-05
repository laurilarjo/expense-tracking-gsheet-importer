
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  initializeGoogleAPIs, 
  requestSheetsAuthorization, 
  checkIfUserIsAuthorized
} from "@/lib/googleSheetsAPI";
import { Info, CheckCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

export const GoogleSheetsAuth = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [authAttempted, setAuthAttempted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      setInitError(null);
      
      try {
        console.log("Component - initializing Google APIs");
        await initializeGoogleAPIs();
        console.log("Component - Google APIs initialized successfully");
        
        // After successful initialization, check if the user is already authorized
        const authorized = await checkIfUserIsAuthorized();
        console.log("Component - Already authorized:", authorized);
        if (authorized) {
          setIsAuthorized(true);
          // Calculate remaining time from stored token
          try {
            const tokenData = localStorage.getItem("google_sheets_token");
            if (tokenData) {
              const { expiresAt } = JSON.parse(tokenData);
              if (expiresAt) {
                const remaining = Math.floor((expiresAt - Date.now()) / 1000);
                if (remaining > 0) {
                  setTimeRemaining(remaining);
                }
              }
            }
          } catch (error) {
            console.error("Error checking token expiration:", error);
          }
        }
      } catch (error) {
        console.error("Component - Failed to initialize Google APIs", error);
        setInitError("Failed to load Google integration");
        toast({
          title: "Google Sheets Login Failed",
          description: "Failed to load Google integration. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [toast]);

  // Update countdown timer every second
  useEffect(() => {
    if (!isAuthorized || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          setIsAuthorized(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthorized, timeRemaining]);

  const handleRequestPermission = async () => {
    setIsAuthorizing(true);
    setAuthAttempted(true);
    
    try {
      console.log("Component - requesting authorization");
      const success = await requestSheetsAuthorization();
      console.log("Component - authorization result:", success);
      
      if (success) {
        setIsAuthorized(true);
        toast({
          title: "Authorization Successful",
          description: "You can now update your Google Sheets documents.",
        });
      } else {
        // Show more detailed error message for failed authorization
        toast({
          title: "Authorization Failed",
          description: "Could not get permission to access Google Sheets. Please ensure pop-ups are allowed and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Component - authorization error", error);
      toast({
        title: "Authorization Failed",
        description: "An unexpected error occurred during authorization.",
        variant: "destructive",
      });
    } finally {
      setIsAuthorizing(false);
    }
  };


  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Info className="h-5 w-5" />
          Google Sheets Login
        </CardTitle>
        <CardDescription>
          Connect your Google account to allow uploading data to your Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthorized ? (
          <div className="space-y-4" data-cy="google-sheets-auth-success">
            <div className="flex items-center justify-center gap-2 bg-green-50 p-4 rounded-md text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Successfully connected to Google Sheets!</span>
              {timeRemaining !== null && (
                <span className="ml-2 text-sm font-mono bg-green-100 px-2 py-1 rounded">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <p className="mb-2">If you're having trouble accessing specific spreadsheets, please ensure:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>The spreadsheet exists and the ID is correct</li>
                <li>You have at least "Viewer" permission to the spreadsheet</li>
                <li>The sheet has been shared with the account you're currently logged in with</li>
              </ol>
            </div>
          </div>
        ) : initError ? (
          <div className="space-y-2" data-cy="google-sheets-auth-error">
            <div className="flex items-center justify-center gap-2 bg-red-50 p-4 rounded-md text-red-700">
              <span>{initError}</span>
            </div>
            <Button onClick={handleRetry} className="w-full flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : authAttempted && !isAuthorizing ? (
          <div className="space-y-4" data-cy="google-sheets-auth-failed">
            <div className="flex flex-col items-center justify-center gap-2 bg-amber-50 p-4 rounded-md text-amber-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Authorization Failed</span>
              </div>
              <p className="text-sm text-center">
                Make sure pop-ups are allowed and the spreadsheet ID is correct. Even if you own the spreadsheet, 
                Google may still require explicit sharing permissions for applications accessing it through the API.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleRequestPermission} 
                disabled={isInitializing || isAuthorizing}
                className="w-full"
                data-cy="google-sheets-auth-retry"
              >
                Try Again
              </Button>
              
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isInitializing || isAuthorizing}
              className="w-full"
              data-cy="google-sheets-auth-button"
            >
              {isInitializing || isAuthorizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isInitializing ? "Initializing..." : "Authorizing..."}
                </>
              ) : (
                "Authorize Google Sheets Access"
              )}
            </Button>
            
          </div>
        )}
      </CardContent>
    </Card>
  );
};
