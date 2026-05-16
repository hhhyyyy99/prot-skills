#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type Tokens = {
  colors?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  boxShadow?: Record<string, string>;
  fontSize?: Record<string, string>;
  transitionDuration?: Record<string, string>;
  transitionTimingFunction?: Record<string, string>;
  [key: string]: unknown;
};

type TailwindThemeExtend = {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  boxShadow?: Record<string, string>;
  fontSize?: Record<string, string>;
  transitionDuration?: Record<string, string>;
  transitionTimingFunction?: Record<string, string>;
  [key: string]: unknown;
};

type TailwindConfig = {
  theme: {
    extend: TailwindThemeExtend;
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const tokens = JSON.parse(readFileSync(resolve(root, "src/design/tokens.json"), "utf-8")) as Tokens;
const tailwindConfig = (await import(resolve(root, "tailwind.config.js")))
  .default as TailwindConfig;

const tw = tailwindConfig.theme.extend;

const dimensions = [
  "colors",
  "spacing",
  "borderRadius",
  "boxShadow",
  "fontSize",
  "transitionDuration",
  "transitionTimingFunction",
] as const;

let hasError = false;

for (const dim of dimensions) {
  const tokenDimension = tokens[dim];
  const tokenKeys = new Set(
    tokenDimension && typeof tokenDimension === "object" ? Object.keys(tokenDimension) : [],
  );
  let twKeys = new Set<string>();
  if (dim === "colors") {
    twKeys = new Set(Object.keys((tw.colors ?? {}) as Record<string, string>));
    const lightKeys = new Set(Object.keys(tokens.colors?.light ?? {}));
    const missing = [...lightKeys].filter((key) => !twKeys.has(key));
    const extra = [...twKeys].filter((key) => !lightKeys.has(key));
    if (missing.length || extra.length) {
      hasError = true;
      console.error("[colors] mismatch:");
      if (missing.length) console.error(`  missing in tailwind: ${missing.join(", ")}`);
      if (extra.length) console.error(`  extra in tailwind: ${extra.join(", ")}`);
    }
  } else {
    const tailwindDimension = tw[dim];
    twKeys = new Set(
      tailwindDimension && typeof tailwindDimension === "object"
        ? Object.keys(tailwindDimension)
        : [],
    );
    const missing = [...tokenKeys].filter((key) => !twKeys.has(key));
    const extra = [...twKeys].filter((key) => !tokenKeys.has(key));
    if (missing.length || extra.length) {
      hasError = true;
      console.error(`[${dim}] mismatch:`);
      if (missing.length) console.error(`  missing in tailwind: ${missing.join(", ")}`);
      if (extra.length) console.error(`  extra in tailwind: ${extra.join(", ")}`);
    }
  }
}

if (hasError) {
  console.error("\nToken consistency check FAILED");
  process.exit(1);
}

console.log("Token consistency check passed");
