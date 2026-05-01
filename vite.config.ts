import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      // Brand-correct social icons platform-wide.
      // Any `import ... from "lucide-react"` resolves to our shim,
      // which re-exports lucide and overrides social icons.
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, "./src/lib/lucide-react-shim.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
}));
