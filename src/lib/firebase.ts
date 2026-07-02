
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration (from .env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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
