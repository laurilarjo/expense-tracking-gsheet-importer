
/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_FUNCTIONS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
