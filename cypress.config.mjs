import dotenv from "dotenv";
import { defineConfig } from "cypress";

dotenv.config({ quiet: true });

export default defineConfig({
  env: {
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
  },
  e2e: {
    baseUrl: 'http://localhost:8080',
  },
  component: {
    devServer: {
      framework: "react", // Change to your framework (react, vue, etc.)
      bundler: "vite",
    },
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
