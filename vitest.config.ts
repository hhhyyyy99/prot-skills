import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import path from "path";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  name: string;
  productName?: string;
  version: string;
};

const appName = packageJson.productName ?? packageJson.name;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_APP_NAME": JSON.stringify(appName),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
