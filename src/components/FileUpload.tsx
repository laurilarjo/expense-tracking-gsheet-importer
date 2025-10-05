import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, CheckCircle2 } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess: (fileName: string) => void;
  onUploadError: (error: string) => void;
}

export const FileUpload = ({ onUploadSuccess, onUploadError }: FileUploadProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) {
      onUploadError("No file selected");
      return;
    }

    if (!file.name.endsWith('.csv')) {
      onUploadError("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(50);

      // Parse CSV with PapaParse
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Parsed CSV rows:', results.data);
          
          setUploadProgress(100);
          setUploadComplete(true);
          setIsUploading(false);
          onUploadSuccess(file.name);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          onUploadError(`Failed to parse CSV: ${error.message}`);
          setIsUploading(false);
        }
      });
    } catch (error) {
      console.error('File reading error:', error);
      onUploadError('Failed to read file');
      setIsUploading(false);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {uploadComplete ? (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? "Drop your CSV file here" : "Drag & drop your CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground">or click to select a file</p>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
};