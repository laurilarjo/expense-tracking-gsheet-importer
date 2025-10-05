import { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  devModeLogin: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Dev mode user structure to match Firebase User interface
interface DevModeUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  isDevMode: boolean;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for dev mode user in localStorage first
    const devModeUser = localStorage.getItem('dev_mode_user');
    if (devModeUser && process.env.NODE_ENV !== 'production') {
      setUser(JSON.parse(devModeUser) as User);
      setLoading(false);
      return () => {};
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log("Starting Google sign-in process...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Sign-in successful:", result.user.email);
      
      toast({
        title: "Welcome!",
        description: `Signed in as ${result.user.email}`,
      });
      navigate('/');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error("Auth error details:", firebaseError.code, firebaseError.message);
      
      let errorMessage = "Failed to sign in with Google";
      
      // Handle specific Firebase Auth error codes
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in cancelled - You closed the popup";
      } else if (firebaseError.code === 'auth/popup-blocked') {
        errorMessage = "Sign-in failed - Please allow popups for this site";
      } else if (firebaseError.code === 'auth/network-request-failed') {
        errorMessage = "Sign-in failed - Please check your internet connection";
      } else if (firebaseError.code === 'auth/unauthorized-domain') {
        errorMessage = "Sign-in failed - This domain is not authorized in your Firebase project";
        console.log("Current domain:", window.location.hostname);
        console.log("Make sure to add this domain to Firebase console > Authentication > Settings > Authorized domains");
      } else if (firebaseError.code === 'auth/internal-error') {
        errorMessage = "Sign-in failed - Firebase internal error. Please try again";
      } else if (firebaseError.code === 'auth/cancelled-popup-request') {
        errorMessage = "Multiple popup requests - Please try again";
      } else if (firebaseError.code === 'auth/operation-not-allowed') {
        errorMessage = "Google sign-in is not enabled for this Firebase project";
        console.log("Enable Google authentication in Firebase console > Authentication > Sign-in method");
      }
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Complete auth error:", error);
    }
  };

  const devModeLogin = (email: string) => {
    if (process.env.NODE_ENV === 'production') {
      console.error("Dev mode login attempted in production");
      return;
    }

    const mockUser: DevModeUser = {
      uid: `dev-${Date.now()}`,
      email: email,
      displayName: `Dev User (${email})`,
      photoURL: 'https://via.placeholder.com/150',
      emailVerified: true,
      isDevMode: true
    };

    // Store in localStorage to persist through refreshes
    localStorage.setItem('dev_mode_user', JSON.stringify(mockUser));
    
    // Set as current user
    setUser(mockUser as unknown as User);
    
    console.log("Dev mode login successful:", email);
    navigate('/');
  };

  const logout = async () => {
    try {
      // Check if it's a dev mode user
      if (user && (user as DevModeUser).isDevMode) {
        localStorage.removeItem('dev_mode_user');
        setUser(null);
        toast({
          title: "Signed out",
          description: "Dev mode user signed out",
        });
        navigate('/login');
        return;
      }

      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      navigate('/login');
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, devModeLogin }}>
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
