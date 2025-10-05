
import { toast } from "@/hooks/use-toast";

// Google Sheets API configuration
// You can set these values directly for development, but use environment variables for production
const API_KEY = "AIzaSyDBI1hjtEOufcGE4vuSh4gl1mOfUHTwm-Y"; 
const CLIENT_ID = "800525699041-13u158c8kfnopeh91ti1avpnj8gb03aj.apps.googleusercontent.com";
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// Constants for localStorage
const TOKEN_STORAGE_KEY = "google_sheets_token";

let gapiInited = false;
let gisInited = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

// For development: This allows you to set a token directly for testing
// In a real app, NEVER include tokens directly in the source code
export const setDevelopmentToken = () => {
  // Only use this in development environment
  if (process.env.NODE_ENV !== 'production') {
    const devToken = {
      token: "your-access-token-here", // Replace with your token for testing
      expiresAt: Date.now() + (3600 * 1000) // 1 hour expiry
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(devToken));
    console.log("Development token set");
    return true;
  }
  return false;
};

// Function to store the token in localStorage
const storeToken = (tokenResponse: { access_token: string; expires_in: number }) => {
  if (!tokenResponse) return;
  
  try {
    const tokenData = {
      token: tokenResponse.access_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    console.log("Token stored in localStorage");
  } catch (error) {
    console.error("Error storing token", error);
  }
};

// Function to retrieve the token from localStorage
const retrieveStoredToken = (): string | null => {
  try {
    const tokenData = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!tokenData) return null;
    
    const { token, expiresAt } = JSON.parse(tokenData);
    
    // Check if token is expired
    if (Date.now() > expiresAt) {
      console.log("Stored token is expired");
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    
    console.log("Retrieved valid token from localStorage");
    return token;
  } catch (error) {
    console.error("Error retrieving token", error);
    return null;
  }
};


// Load the Google API client library
export const loadGapiClient = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (gapiInited) {
      console.log("GAPI client already loaded");
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      // Using the properly typed gapi.load method
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInited = true;
          console.log("GAPI client loaded");
          resolve();
        } catch (error) {
          console.error("Error initializing GAPI client", error);
          reject(error);
        }
      });
    };
    script.onerror = (e) => {
      console.error("Error loading GAPI script", e);
      reject(e);
    };
    document.body.appendChild(script);
  });
};

// Load the Google Identity Services library
export const loadGisClient = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (gisInited && tokenClient) {
      console.log("GIS client already loaded");
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      console.log('GIS client script loaded');
      
      try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("Token error:", tokenResponse);
            return;
          }
          
          console.log("Token received:", tokenResponse);
          
          gisInited = true;
        },
      });
        console.log("TokenClient initialized");
        resolve();
      } catch (error) {
        console.error("Error initializing TokenClient", error);
        reject(error);
      }
    };
    script.onerror = (e) => {
      console.error("Error loading GIS script", e);
      reject(e);
    };
    document.body.appendChild(script);
  });
};

// Check if user already has a valid token
export const checkIfUserIsAuthorized = async (): Promise<boolean> => {
  if (!gapiInited) {
    console.log("GAPI client not initialized yet for auth check");
    return false;
  }
  
  try {
    console.log("Checking if user is already authorized");
    
    // Try to retrieve the token from localStorage
    const storedToken = retrieveStoredToken();
    if (storedToken) {
      console.log("Found stored token, user is authorized");
      return true;
    }
    
    // For development only: set a development token if needed
    if (process.env.NODE_ENV !== 'production') {
      // Uncomment the line below to automatically set a development token
      // const devTokenSet = setDevelopmentToken();
      // if (devTokenSet) return true;
    }
    
    return false;
  } catch (error) {
    console.log("Error checking authorization", error);
    return false;
  }
};

// Request Google Sheets authorization
export const requestSheetsAuthorization = async (): Promise<boolean> => {
  console.log("Starting sheets authorization");
  
  if (!gapiInited || !tokenClient) {
    try {
      console.log("APIs not initialized, initializing now");
      await initializeGoogleAPIs();
    } catch (error) {
      console.error("Failed to initialize Google APIs", error);
      toast({
        title: "Authorization Failed",
        description: "Could not initialize Google APIs. Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  }

  return new Promise((resolve) => {
    try {
      if (!tokenClient) {
        console.error("TokenClient not initialized");
        toast({
          title: "Authorization Failed",
          description: "Google authorization service is not available.",
          variant: "destructive",
        });
        resolve(false);
        return;
      }
      
      console.log("Requesting access token");
      const originalCallback = tokenClient.callback;
      
      tokenClient.callback = (tokenResponse) => {
        // Restore original callback
        if (tokenClient) {
          tokenClient.callback = originalCallback;
        }
        
        if (tokenResponse.error) {
          console.error("Authorization error", tokenResponse);
          toast({
            title: "Authorization Failed",
            description: "Failed to get authorization for Google Sheets.",
            variant: "destructive",
          });
          resolve(false);
          return;
        }
        console.log(JSON.stringify(tokenResponse));
        storeToken(tokenResponse);
        console.log("Authorization successful");
        toast({
          title: "Authorization Successful",
          description: "You can now update your Google Sheets documents.",
        });
        resolve(true);
      };
      
      // Request authorization with prompt to get refresh token
      tokenClient.requestAccessToken({ 
        prompt: "consent" // Force consent to get refresh token
      });
      
    } catch (error) {
      console.error("Error requesting authorization", error);
      toast({
        title: "Authorization Error",
        description: "An error occurred during authorization.",
        variant: "destructive",
      });
      resolve(false);
    }
  });
};

// Initialize both Google APIs
export const initializeGoogleAPIs = async (): Promise<void> => {
  try {
    console.log('Initializing Google APIs');
    
    // Load GAPI first, then GIS
    await loadGapiClient();
    await loadGisClient();
    
    console.log("Google APIs initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Google APIs", error);
    throw error;
  }
};
