#!/usr/bin/env node
/**
 * Visual constraint audit for the UI redesign.
 *
 * Enforces Requirement 17.5:
 *   - 不允许 bg-gradient-*
 *   - 不允许 Tailwind 原生 shadow-{sm,md,lg,xl,2xl}（仅允许 shadow-overlay / shadow-none）
 *   - 不允许硬编码彩色 class（bg-gray-* / bg-blue-* / bg-green-* / bg-red-* /
 *     bg-orange-* / bg-yellow-* / text-blue-* / text-green-* / text-red-* /
 *     text-orange-* / text-yellow-*）
 *
 * 退出码：违反任一规则时非零。
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'dist', '.git']);
const EXTS = new Set(['.ts', '.tsx', '.css']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(join(dir, e.name))));
    } else if (EXTS.has(extname(e.name))) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

const RULES = [
  {
    id: 'no-bg-gradient',
    pattern: /\bbg-gradient-[\w-]+/g,
    message: 'Tailwind 渐变背景被禁用。整屏只使用 token 颜色。',
  },
  {
    id: 'no-raw-shadow',
    // 仅匹配 Tailwind 原生 shadow-sm/md/lg/xl/2xl，排除 shadow-overlay / shadow-none
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b/g,
    message: '只允许 shadow-overlay 与 shadow-none。',
  },
  {
    id: 'no-hardcoded-color-bg',
    pattern: /\bbg-(?:gray|blue|green|red|orange|yellow|pink|purple|cyan|teal|indigo|sky|rose|amber|emerald|fuchsia|lime|violet|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message: '硬编码彩色背景被禁用。使用 token: bg-canvas / bg-surface / bg-surface-raised / bg-accent。',
  },
  {
    id: 'no-hardcoded-color-text',
    pattern: /\btext-(?:blue|green|red|orange|yellow|pink|purple|cyan|teal|indigo|sky|rose|amber|emerald|fuchsia|lime|violet|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message: '硬编码彩色文字被禁用。使用 token: text-text-primary / text-text-secondary / text-text-tertiary / text-accent / text-danger / text-warning / text-success。',
  },
  {
    id: 'no-hardcoded-color-border',
    pattern: /\bborder-(?:blue|green|red|orange|yellow|pink|purple|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message: '硬编码彩色边框被禁用。使用 token: border-border-subtle / border-border-default / border-accent / border-danger。',
  },
];

async function main() {
  const files = await walk(SRC);
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const lines = content.split('\n');
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let m;
      while ((m = rule.pattern.exec(content)) !== null) {
        // compute line number
        const before = content.slice(0, m.index);
        const line = before.split('\n').length;
        const lineText = lines[line - 1]?.trim() ?? '';
        violations.push({
          rule: rule.id,
          message: rule.message,
          file: relative(ROOT, file),
          line,
          match: m[0],
          snippet: lineText,
        });
      }
    }
  }

  if (violations.length === 0) {
    console.log('✅ Visual audit passed — no violations found');
    console.log(`   checked ${files.length} file(s), ${RULES.length} rule(s)`);
    process.exit(0);
  }

  console.error(`❌ Visual audit failed — ${violations.length} violation(s)\n`);
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  for (const [rule, list] of byRule) {
    console.error(`[${rule}] — ${list[0].message}`);
    for (const v of list) {
      console.error(`  ${v.file}:${v.line}  ${v.match}`);
      console.error(`    ${v.snippet}`);
    }
    console.error('');
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
