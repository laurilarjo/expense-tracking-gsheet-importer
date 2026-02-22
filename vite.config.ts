
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    tailwindcss(),
  ].filter(Boolean),
  resolve: {
    // Path aliases for imports - this replaces the need to configure it in tsconfig.json
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
