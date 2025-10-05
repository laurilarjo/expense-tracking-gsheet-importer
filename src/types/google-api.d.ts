
// Google API Type definitions
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        error?: string;
        scope: string;
        token_type: string;
      }
      
      interface TokenClient {
        callback: (response: TokenResponse) => void;
        requestAccessToken: (options?: { prompt?: string }) => void;
      }
      
      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }): TokenClient;
    }
  }
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;
  
  namespace client {
    function init(args: { apiKey: string; discoveryDocs: string[] }): Promise<void>;
    function getToken(): { access_token: string } | null;
    function setToken(token: { access_token: string }): void;
    
    namespace sheets {
      namespace spreadsheets {
        namespace values {
          function get(params: {
            spreadsheetId: string;
            range: string;
          }): Promise<{ values: string[][] }>;
          
          function update(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            resource: { values: string[][] };
          }): Promise<{ updatedRows: number; updatedColumns: number; updatedCells: number }>;
        }
      }
    }
  }
}
