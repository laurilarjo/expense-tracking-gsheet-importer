import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  clearSheetsAuthorization,
  hasValidSheetsToken,
  initializeGoogleAPIs,
  requestSheetsAuthorization,
} from '@/lib/googleSheetsAPI';

export interface AuthUser {
  email: string | null;
  displayName: string;
  isDevMode: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  devModeLogin: (email: string) => void;
  /** Call after Sheets auth succeeds outside of login (e.g. re-auth on home). */
  refreshAuthFromStorage: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const sheetsAuthUser = (): AuthUser => ({
  email: null,
  displayName: 'Google Sheets',
  isDevMode: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshAuthFromStorage = () => {
    const devModeUser = localStorage.getItem('dev_mode_user');
    if (devModeUser && process.env.NODE_ENV !== 'production') {
      try {
        setUser(JSON.parse(devModeUser) as AuthUser);
        return;
      } catch {
        localStorage.removeItem('dev_mode_user');
      }
    }

    if (hasValidSheetsToken()) {
      setUser(sheetsAuthUser());
      return;
    }

    setUser(null);
  };

  useEffect(() => {
    refreshAuthFromStorage();
    setLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    try {
      await initializeGoogleAPIs();
      const success = await requestSheetsAuthorization();
      if (success) {
        setUser(sheetsAuthUser());
        navigate('/');
      }
    } catch (error: unknown) {
      console.error('Sheets authorization error:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to authorize Google Sheets access. Please allow popups and try again.',
        variant: 'destructive',
      });
    }
  };

  const devModeLogin = (email: string) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Dev mode login attempted in production');
      return;
    }

    const mockUser: AuthUser = {
      email,
      displayName: `Dev User (${email})`,
      isDevMode: true,
    };

    localStorage.setItem('dev_mode_user', JSON.stringify(mockUser));
    setUser(mockUser);
    console.log('Dev mode login successful:', email);
    navigate('/');
  };

  const logout = async () => {
    try {
      if (user?.isDevMode) {
        localStorage.removeItem('dev_mode_user');
        setUser(null);
        toast({
          title: 'Signed out',
          description: 'Dev mode user signed out',
        });
        navigate('/login');
        return;
      }

      clearSheetsAuthorization();
      setUser(null);
      toast({
        title: 'Signed out',
        description: 'Google Sheets access cleared',
      });
      navigate('/login');
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        logout,
        devModeLogin,
        refreshAuthFromStorage,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
