
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MultiBankFileUpload } from "@/components/MultiBankFileUpload";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleSheetsAuth } from "@/components/GoogleSheetsAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { NavigationBar } from "@/components/NavigationBar";

const Index = () => {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      <NavigationBar />
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter">Google Sheets Uploader</h1>
          </div>
        
        {/* Google Sheets Authorization */}
        <GoogleSheetsAuth />
        
        {/* File Upload Card */}
        <Card className="w-full p-6 space-y-6 shadow-lg animate-fade-in">
          <MultiBankFileUpload 
            onUploadSuccess={(fileName, bankName) => {
              toast({
                title: "File uploaded successfully",
                description: `${fileName} from ${bankName} has been processed and uploaded to Google Sheets`,
              });
            }}
            onUploadError={(error) => {
              toast({
                variant: "destructive",
                title: "Error uploading file",
                description: error,
              });
            }}
          />
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
