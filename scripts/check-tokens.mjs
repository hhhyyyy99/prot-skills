#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const tokens = JSON.parse(readFileSync(resolve(root, 'src/design/tokens.json'), 'utf-8'));
const tailwindConfig = (await import(resolve(root, 'tailwind.config.js'))).default;

const tw = tailwindConfig.theme.extend;

const dimensions = [
  'colors',
  'spacing',
  'borderRadius',
  'boxShadow',
  'fontSize',
  'transitionDuration',
  'transitionTimingFunction',
];

let hasError = false;

for (const dim of dimensions) {
  const tokenKeys = new Set(Object.keys(tokens[dim] ?? {}));
  let twKeys;
  if (dim === 'colors') {
    twKeys = new Set(Object.keys(tw.colors ?? {}));
    // tokens.colors has light/dark sub-objects; compare against light keys
    const lightKeys = new Set(Object.keys(tokens.colors?.light ?? {}));
    const missing = [...lightKeys].filter(k => !twKeys.has(k));
    const extra = [...twKeys].filter(k => !lightKeys.has(k));
    if (missing.length || extra.length) {
      hasError = true;
      console.error(`[colors] mismatch:`);
      if (missing.length) console.error(`  missing in tailwind: ${missing.join(', ')}`);
      if (extra.length) console.error(`  extra in tailwind: ${extra.join(', ')}`);
    }
  } else {
    twKeys = new Set(Object.keys(tw[dim] ?? {}));
    const missing = [...tokenKeys].filter(k => !twKeys.has(k));
    const extra = [...twKeys].filter(k => !tokenKeys.has(k));
    if (missing.length || extra.length) {
      hasError = true;
      console.error(`[${dim}] mismatch:`);
      if (missing.length) console.error(`  missing in tailwind: ${missing.join(', ')}`);
      if (extra.length) console.error(`  extra in tailwind: ${extra.join(', ')}`);
    }
  }
}

if (hasError) {
  console.error('\n❌ Token consistency check FAILED');
  process.exit(1);
} else {
  console.log('✅ Token consistency check passed');
}
