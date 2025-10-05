import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, CheckCircle2, Building2, User, BarChart3, Calendar, Euro, User as UserIcon, Tag } from "lucide-react";
import { parseOPFile } from "@/lib/parsers/op-parse";
import { parseNordeaFiFile } from "@/lib/parsers/nordea-fi-parse";
import { parseNordeaSeFile } from "@/lib/parsers/nordea-se-parse";
import { parseNorwegianFile } from "@/lib/parsers/norwegian-parse";
import { parseBinanceFile } from "@/lib/parsers/binance-parse";
import { parseHandelsbankenFile } from "@/lib/parsers/handelsbanken-parse";
import { BANK_CONFIG, Bank } from "@/lib/types/bank";
import { BankLogo } from "@/components/BankLogo";
import { useSettings } from "@/contexts/SettingsContext";
import { GoogleSheetsService } from "@/lib/services/google-sheets-service";
import { UploadSummary } from "@/lib/types/upload-result";

interface MultiBankFileUploadProps {
  onUploadSuccess: (fileName: string, bankName: string) => void;
  onUploadError: (error: string) => void;
}

export const MultiBankFileUpload = ({ onUploadSuccess, onUploadError }: MultiBankFileUploadProps) => {
  const { settings, setLastSelectedUser, refreshSettings } = useSettings();
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadComplete, setUploadComplete] = useState<{ [key: string]: boolean }>({});
  const [uploadSummaries, setUploadSummaries] = useState<UploadSummary[]>([]);
  
  // Get the currently selected user
  const selectedUser = settings.users.find(user => user.id === settings.lastSelectedUser);
  
  // Get banks assigned to the selected user
  const userBanks = selectedUser ? selectedUser.allowedBanks : [];

  // Refresh settings when component mounts to ensure we have the latest Google Sheets ID
  useEffect(() => {
    refreshSettings();
    console.log('🔄 Refreshed settings, Google Sheets ID:', settings.googleSheetsId);
  }, [refreshSettings, settings.googleSheetsId]);

  const onDrop = useCallback(async (acceptedFiles: File[], bankKey: string) => {
    const file = acceptedFiles[0];
    
    if (!file) {
      onUploadError("No file selected");
      return;
    }

    const bankInfo = BANK_CONFIG[bankKey as Bank];
    if (!bankInfo) {
      onUploadError("Invalid bank selected");
      return;
    }

    // Check file extension
    const expectedExtensions = bankInfo.fileTypes;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!expectedExtensions.includes(`.${fileExtension}`)) {
      onUploadError(`Please upload a ${expectedExtensions.join(' or ')} file for ${bankInfo.name}`);
      return;
    }

    setIsUploading(prev => ({ ...prev, [bankKey]: true }));
    setUploadProgress(prev => ({ ...prev, [bankKey]: 0 }));

    try {
      setUploadProgress(prev => ({ ...prev, [bankKey]: 50 }));

      // Parse based on bank type
      let transactions;
      if (bankKey === Bank.OP) {
        transactions = await parseOPFile(file);
      } else if (bankKey === Bank.NORDEA_FI) {
        transactions = await parseNordeaFiFile(file);
      } else if (bankKey === Bank.NORDEA_SE) {
        transactions = await parseNordeaSeFile(file);
      } else if (bankKey === Bank.NORWEGIAN) {
        transactions = await parseNorwegianFile(file);
      } else if (bankKey === Bank.BINANCE) {
        transactions = await parseBinanceFile(file);
      } else if (bankKey === Bank.HANDELSBANKEN) {
        transactions = await parseHandelsbankenFile(file);
      } else {
        // For other banks, just log for now
        console.log(`File uploaded for ${bankInfo.name}:`, file.name);
        setUploadProgress(prev => ({ ...prev, [bankKey]: 100 }));
        setUploadComplete(prev => ({ ...prev, [bankKey]: true }));
        setIsUploading(prev => ({ ...prev, [bankKey]: false }));
        onUploadSuccess(file.name, bankInfo.name);
        return;
      }
        
        // Upload to Google Sheets if user is selected and Google Sheets is configured
        if (selectedUser && settings.googleSheetsId) {
          try {
            setUploadProgress(prev => ({ ...prev, [bankKey]: 75 }));
            
            console.log('📊 Using Google Sheets ID:', settings.googleSheetsId);
            
            // Get access token
            const tokenData = localStorage.getItem("google_sheets_token");
            if (!tokenData) {
              throw new Error("No Google Sheets access token found. Please authorize first.");
            }
            
            const { token } = JSON.parse(tokenData);
            
            // Create context for sheets operation
            const sheetsService = GoogleSheetsService.getInstance();
            const context = sheetsService.createContext(bankKey as Bank, selectedUser.name);
            
            console.log('📋 Sheet context:', context);
            
            // Import to Google Sheets
            const uploadResult = await sheetsService.importToSheets(
              transactions, 
              context, 
              settings.googleSheetsId, 
              token
            );
            
            // Store upload summary
            const summary: UploadSummary = {
              fileName: file.name,
              bankName: `${selectedUser.name} - ${bankInfo.name}`,
              result: uploadResult,
              timestamp: new Date()
            };
            
            setUploadSummaries(prev => [...prev, summary]);
            
            // Check if upload was successful
            if (uploadResult.success) {
              console.log(`Successfully uploaded ${transactions.length} transactions to Google Sheets`);
            } else {
              // Upload failed - show error message
              const errorMessage = uploadResult.error || 'Unknown error occurred during upload';
              onUploadError(`Failed to upload to Google Sheets: ${errorMessage}`);
              setIsUploading(prev => ({ ...prev, [bankKey]: false }));
              return;
            }
          } catch (sheetsError) {
            console.error('Error uploading to Google Sheets:', sheetsError);
            onUploadError(`Failed to upload to Google Sheets: ${sheetsError instanceof Error ? sheetsError.message : 'Unknown error'}`);
            setIsUploading(prev => ({ ...prev, [bankKey]: false }));
            return;
          }
        }
        
        setUploadProgress(prev => ({ ...prev, [bankKey]: 100 }));
        setUploadComplete(prev => ({ ...prev, [bankKey]: true }));
        setIsUploading(prev => ({ ...prev, [bankKey]: false }));
        onUploadSuccess(file.name, bankInfo.name);
    } catch (error) {
      console.error(`${bankInfo.name} parsing error:`, error);
      onUploadError(`Failed to parse ${bankInfo.name} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(prev => ({ ...prev, [bankKey]: false }));
    }
  }, [onUploadSuccess, onUploadError, selectedUser, settings.googleSheetsId]);


  const CreateDropzone = ({ bankKey, bankInfo }: { bankKey: string; bankInfo: { name: string; fileTypes: string[] } }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (files) => onDrop(files, bankKey),
      accept: bankInfo.fileTypes.reduce((acc: Record<string, string[]>, ext: string) => {
        const mimeType = ext === '.csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        acc[mimeType] = [ext];
        return acc;
      }, {}),
      multiple: false
    });

    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}
          ${isUploading[bankKey] ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {uploadComplete[bankKey] ? (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          ) : (
            <BankLogo bank={bankKey as Bank} className={bankKey === Bank.OP ? "h-16 w-16" : "h-26 w-26"} />
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop your file here" : `Drag & drop or click to select ${bankInfo.fileTypes.join(' or ')} file`}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold">Upload Bank Files</h3>
        <p className="text-muted-foreground">Select the appropriate bank and upload your transaction file</p>
      </div>

      {/* User Selector */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-2">
          <User className="h-5 w-5" />
          Select User
        </h4>
        <div className="flex flex-wrap gap-2">
          {settings.users.map((user) => (
            <Button
              key={user.id}
              variant={settings.lastSelectedUser === user.id ? "default" : "outline"}
              size="sm"
              onClick={() => setLastSelectedUser(user.id)}
            >
              {user.name}
            </Button>
          ))}
        </div>
        {selectedUser && (
          <p className="text-sm text-muted-foreground">
            Selected: <strong>{selectedUser.name}</strong> - Banks: {userBanks.join(', ') || 'None assigned'}
          </p>
        )}
      </div>

      {/* Bank Uploads - Only show banks assigned to selected user */}
      {selectedUser && userBanks.length > 0 ? (
        <div className="space-y-6">
          <h4 className="text-lg font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Upload Areas
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userBanks.map((bankId) => {
              const bank = BANK_CONFIG[bankId as Bank];
              if (!bank) return null;
              
              return (
                <div key={bankId} className="space-y-4">
                  <h5 className="text-md font-medium text-center">
                    {bank.name}
                  </h5>
                  <CreateDropzone bankKey={bankId as Bank} bankInfo={bank} />
                  
                  {isUploading[bankId] && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress[bankId] || 0} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Processing {bank.name} file... {uploadProgress[bankId] || 0}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : selectedUser ? (
        <div className="text-center text-muted-foreground py-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No banks assigned to {selectedUser.name}</p>
          <p className="text-sm">Go to Settings to assign banks to this user</p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No user selected</p>
          <p className="text-sm">Please select a user to see available bank uploads</p>
        </div>
      )}

      {/* Upload Summary Section */}
      {uploadSummaries.length > 0 && (
        <div className="space-y-6 mt-8">
          <h4 className="text-lg font-medium flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Upload Summary
          </h4>
          
          <div className="space-y-4">
            {uploadSummaries
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((summary, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">{summary.fileName}</h5>
                    <p className="text-sm text-muted-foreground">
                      {summary.bankName} • {summary.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    summary.result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {summary.result.success ? 'Success' : 'Failed'}
                  </div>
                </div>

                {summary.result.success ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{summary.result.existingTransactionsCount}</div>
                      <div className="text-sm text-muted-foreground">Existing in Sheet</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{summary.result.fileTransactionsCount}</div>
                      <div className="text-sm text-muted-foreground">From File</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{summary.result.newTransactionsCount}</div>
                      <div className="text-sm text-muted-foreground">New Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{summary.result.writtenTransactionsCount}</div>
                      <div className="text-sm text-muted-foreground">Written to Sheet</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 text-sm">
                    Error: {summary.result.error}
                  </div>
                )}

                {/* New Transactions Details */}
                {summary.result.success && summary.result.newTransactions.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="font-medium text-sm">New Transactions Added:</h6>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {summary.result.newTransactions.map((transaction, txIndex) => (
                        <div key={txIndex} className="text-xs bg-gray-50 p-2 rounded flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span>{transaction.date}</span>
                          <Euro className="h-3 w-3 text-gray-500" />
                          <span className="font-mono">{transaction.amountEur.toFixed(2)}</span>
                          <UserIcon className="h-3 w-3 text-gray-500" />
                          <span className="truncate flex-1">{transaction.payee}</span>
                          <Tag className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-600">{transaction.transactionType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
