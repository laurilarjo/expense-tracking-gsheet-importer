/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
