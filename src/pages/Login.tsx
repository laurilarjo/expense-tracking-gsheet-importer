
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const { signInWithGoogle, devModeLogin } = useAuth();
  const { toast } = useToast();
  const [showDevOptions, setShowDevOptions] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  const handleDevModeClick = () => {
    const email = window.prompt("Enter your email for dev mode login:");
    if (email) {
      devModeLogin(email);
      toast({
        title: "Dev Mode Login",
        description: `Logged in as ${email} (development mode)`,
      });
    }
  };

  // Secret key combo to show dev options (triple-click on title)
  const handleTitleClick = () => {
    if (isDev) {
      setShowDevOptions(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle 
            className="text-2xl font-bold tracking-tight cursor-default" 
            onClick={handleTitleClick}
            onDoubleClick={() => {}}
          >
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={signInWithGoogle}
            className="w-full"
            variant="outline"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {(isDev && showDevOptions) && (
            <Button
              onClick={handleDevModeClick}
              className="w-full mt-2 flex items-center justify-center"
              variant="secondary"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Use Dev Mode Login
            </Button>
          )}

          {isDev && !showDevOptions && (
            <p className="text-xs text-center text-gray-500 mt-4">
              <span className="opacity-0">Dev mode available (triple-click title)</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
