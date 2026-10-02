
import { MultiBankFileUpload } from "@/components/MultiBankFileUpload";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter">Lala Expense Tracker</h1>
            <p className="text-muted-foreground text-sm">
              Follow the steps below to import bank transactions into Google Sheets.
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default Index;
