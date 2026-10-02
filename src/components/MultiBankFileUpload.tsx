import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Building2, User, BarChart3, Calendar, Euro, User as UserIcon, Tag, Loader2, CheckCircle, Upload } from "lucide-react";
import { parseOPFile } from "@/lib/parsers/op-parse";
import { parseOPCreditCardFile } from "@/lib/parsers/op-credit-card-parse";
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
import { applyHighConfidenceCategories, CategorizationPredictor } from "@/components/CategorizationPredictor";
import { Transaction } from "@/lib/types/transaction";
import { CategorizationPrediction } from "@/lib/types/categorization";
import { WorkflowStep } from "@/components/WorkflowStep";
import { GoogleSheetsAuth } from "@/components/GoogleSheetsAuth";
import { hasValidSheetsToken } from "@/lib/googleSheetsAPI";

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
  
  const [sheetsAuthorized, setSheetsAuthorized] = useState(() => hasValidSheetsToken());
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [currentBankKey, setCurrentBankKey] = useState<string>('');
  const [fileSessionKey, setFileSessionKey] = useState<string>('');
  const [categorizationPredictions, setCategorizationPredictions] = useState<CategorizationPrediction[]>([]);
  const [categorizationSkipped, setCategorizationSkipped] = useState(false);
  const [sheetsUploadDone, setSheetsUploadDone] = useState(false);
  
  const selectedUser = settings.users.find(user => user.id === settings.lastSelectedUser);
  const userBanks = selectedUser ? selectedUser.allowedBanks : [];

  const hasParsedFile = parsedTransactions.length > 0;
  const categorizationComplete = categorizationPredictions.length > 0 || categorizationSkipped;
  const isSheetsUploading = Boolean(currentBankKey && isUploading[currentBankKey]);

  useEffect(() => {
    refreshSettings();
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

    const expectedExtensions = bankInfo.fileTypes;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!expectedExtensions.includes(`.${fileExtension}`)) {
      onUploadError(`Please upload a ${expectedExtensions.join(' or ')} file for ${bankInfo.name}`);
      return;
    }

    setIsUploading(prev => ({ ...prev, [bankKey]: true }));
    setUploadProgress(prev => ({ ...prev, [bankKey]: 0 }));
    setSheetsUploadDone(false);
    setCategorizationSkipped(false);
    setCategorizationPredictions([]);

    try {
      setUploadProgress(prev => ({ ...prev, [bankKey]: 50 }));

      let transactions;
      if (bankKey === Bank.OP) {
        transactions = await parseOPFile(file);
      } else if (bankKey === Bank.OP_CREDIT_CARD) {
        transactions = await parseOPCreditCardFile(file);
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
        console.log(`File uploaded for ${bankInfo.name}:`, file.name);
        setUploadProgress(prev => ({ ...prev, [bankKey]: 100 }));
        setUploadComplete(prev => ({ ...prev, [bankKey]: true }));
        setIsUploading(prev => ({ ...prev, [bankKey]: false }));
        onUploadSuccess(file.name, bankInfo.name);
        return;
      }
        
      setParsedTransactions(transactions);
      setCurrentBankKey(bankKey);
      setFileSessionKey(`${bankKey}-${file.name}-${Date.now()}`);
      setUploadProgress(prev => ({ ...prev, [bankKey]: 100 }));
      setIsUploading(prev => ({ ...prev, [bankKey]: false }));
    } catch (error) {
      console.error(`${bankInfo.name} parsing error:`, error);
      onUploadError(`Failed to parse ${bankInfo.name} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(prev => ({ ...prev, [bankKey]: false }));
    }
  }, [onUploadSuccess, onUploadError]);

  const handlePredictionsUpdate = (predictions: CategorizationPrediction[]) => {
    setCategorizationPredictions(predictions);
    if (predictions.length > 0) {
      setCategorizationSkipped(false);
    }
  };

  const handleTransactionUpdate = (updatedTransactions: Transaction[]) => {
    setParsedTransactions(updatedTransactions);
  };

  const proceedWithUpload = async (categorizedTransactions?: Transaction[]) => {
    if (!selectedUser || !settings.googleSheetsId) {
      onUploadError("No user selected or Google Sheets not configured");
      return;
    }

    if (!currentBankKey) {
      onUploadError("No bank file selected");
      return;
    }

    try {
      setIsUploading(prev => ({ ...prev, [currentBankKey]: true }));
      setUploadProgress(prev => ({ ...prev, [currentBankKey]: 75 }));
      
      const tokenData = localStorage.getItem("google_sheets_token");
      if (!tokenData) {
        throw new Error("No Google Sheets access token found. Please authorize first.");
      }
      
      const { token } = JSON.parse(tokenData);
      const sheetsService = GoogleSheetsService.getInstance();
      const context = sheetsService.createContext(currentBankKey as Bank, selectedUser.name);
      const transactionsToUpload = categorizedTransactions || parsedTransactions;
      
      const uploadResult = await sheetsService.importToSheets(
        transactionsToUpload, 
        context, 
        settings.googleSheetsId, 
        token
      );
      
      const summary: UploadSummary = {
        fileName: `File for ${currentBankKey}`,
        bankName: `${selectedUser.name} - ${BANK_CONFIG[currentBankKey as Bank]?.name}`,
        result: uploadResult,
        timestamp: new Date()
      };
      
      setUploadSummaries(prev => [...prev, summary]);
      
      if (uploadResult.success) {
        setUploadComplete(prev => ({ ...prev, [currentBankKey]: true }));
        setSheetsUploadDone(true);
        onUploadSuccess(`File for ${currentBankKey}`, BANK_CONFIG[currentBankKey as Bank]?.name || 'Unknown Bank');
      } else {
        const errorMessage = uploadResult.error || 'Unknown error occurred during upload';
        onUploadError(`Failed to upload to Google Sheets: ${errorMessage}`);
      }
    } catch (sheetsError) {
      console.error('Error uploading to Google Sheets:', sheetsError);
      onUploadError(`Failed to upload to Google Sheets: ${sheetsError instanceof Error ? sheetsError.message : 'Unknown error'}`);
    } finally {
      setIsUploading(prev => ({ ...prev, [currentBankKey]: false }));
    }
  };

  const handleUploadToSheets = async () => {
    const categorized = categorizationPredictions.length > 0
      ? applyHighConfidenceCategories(parsedTransactions, categorizationPredictions)
      : parsedTransactions;
    setParsedTransactions(categorized);
    await proceedWithUpload(categorized);
  };

  const handleSkipCategorization = () => {
    setCategorizationSkipped(true);
  };

  const CreateDropzone = ({ bankKey, bankInfo }: { bankKey: string; bankInfo: { name: string; fileTypes: string[] } }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (files) => onDrop(files, bankKey),
      accept: bankInfo.fileTypes.reduce((acc: Record<string, string[]>, ext: string) => {
        const mimeType =
          ext === '.csv' ? 'text/csv'
          : ext === '.xml' ? 'application/xml'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        acc[mimeType] = [ext];
        return acc;
      }, {}),
      multiple: false,
      disabled: !sheetsAuthorized,
    });

    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}
          ${isUploading[bankKey] || !sheetsAuthorized ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {uploadComplete[bankKey] ? (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          ) : (
            <BankLogo bank={bankKey as Bank} className={(bankKey === Bank.OP || bankKey === Bank.OP_CREDIT_CARD) ? "h-16 w-16" : "h-26 w-26"} />
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
      <WorkflowStep
        step={1}
        title="Login to Google Sheets"
        description="Connect your Google account so the app can write to your spreadsheet."
        enabled
        completed={sheetsAuthorized}
      >
        <GoogleSheetsAuth onAuthorizedChange={setSheetsAuthorized} />
      </WorkflowStep>

      <WorkflowStep
        step={2}
        title="Upload bank files"
        description="Select a user and upload a transaction export from one of their banks."
        enabled={sheetsAuthorized}
        completed={hasParsedFile}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Select User
            </h4>
            <div className="flex flex-wrap gap-2">
              {settings.users.map((user) => (
                <Button
                  key={user.id}
                  variant={settings.lastSelectedUser === user.id ? "default" : "outline-solid"}
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

              {hasParsedFile && (
                <p className="text-sm text-center text-green-700 bg-green-50 rounded-md p-3">
                  Parsed {parsedTransactions.length} transactions. Continue to categorization below.
                </p>
              )}
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
        </div>
      </WorkflowStep>

      <WorkflowStep
        step={3}
        title="Categorize transactions automatically"
        description="Run the ML model to suggest categories, or skip this step."
        enabled={hasParsedFile}
        completed={categorizationComplete}
      >
        <div className="space-y-4">
          <CategorizationPredictor
            transactions={parsedTransactions}
            resetKey={fileSessionKey}
            onPredictionsUpdate={handlePredictionsUpdate}
            onTransactionUpdate={handleTransactionUpdate}
          />

          {hasParsedFile && (
            <Button
              onClick={handleSkipCategorization}
              variant="outline"
              disabled={isSheetsUploading || categorizationPredictions.length > 0}
            >
              Skip categorization
            </Button>
          )}
        </div>
      </WorkflowStep>

      <WorkflowStep
        step={4}
        title="Upload to Google Sheets"
        description="Write the parsed transactions to your spreadsheet."
        enabled={categorizationComplete}
        completed={sheetsUploadDone}
      >
        {categorizationComplete ? (
          <div className="space-y-3">
            <Button
              onClick={handleUploadToSheets}
              disabled={isSheetsUploading || !hasParsedFile}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSheetsUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload to Google Sheets
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Only high confidence categories will be populated
            </p>
            <p className="text-sm text-muted-foreground">
              {parsedTransactions.length} transaction{parsedTransactions.length === 1 ? '' : 's'} ready to upload
              {categorizationPredictions.length > 0
                ? ` · ${categorizationPredictions.filter(p => p.result.confidence >= 0.8).length} high-confidence categories`
                : categorizationSkipped
                  ? ' · categories skipped'
                  : ''}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Generate predictions or skip categorization to unlock upload.</p>
          </div>
        )}
      </WorkflowStep>

      {uploadSummaries.length > 0 && (
        <div className="space-y-6">
          <h4 className="text-lg font-medium flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Upload Summary
          </h4>
          
          <div className="space-y-4">
            {uploadSummaries
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((summary, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
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
