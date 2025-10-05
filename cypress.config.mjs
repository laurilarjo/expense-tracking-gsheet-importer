
import { defineConfig } from "cypress";

export default defineConfig({
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
