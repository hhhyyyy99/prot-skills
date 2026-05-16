import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  name: string;
  productName?: string;
  version: string;
};

const appName = packageJson.productName ?? packageJson.name;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_APP_NAME": JSON.stringify(appName),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
