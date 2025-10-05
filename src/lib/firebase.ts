
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
// Note: These are development values. In a production environment,
// you should use environment variables for these values.
const firebaseConfig = {
  apiKey: "AIzaSyDBI1hjtEOufcGE4vuSh4gl1mOfUHTwm-Y",
  authDomain: "expense-tracker-328619.firebaseapp.com",
  projectId: "expense-tracker-328619",
  storageBucket: "expense-tracker-328619.appspot.com", // Corrected from .firebasestorage.app
  messagingSenderId: "800525699041",
  appId: "1:800525699041:web:7c156dce25e6192c3c34a0"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: unknown) {
  // Check if it's already initialized
  const firebaseError = error as { code?: string };
  if (firebaseError.code === 'app/duplicate-app') {
    app = initializeApp(firebaseConfig, "secondary");
  } else {
    console.error('Firebase initialization error', error);
    throw error;
  }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { app };
