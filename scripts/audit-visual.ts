#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

type Violation = {
  rule: string;
  message: string;
  file: string;
  line: number;
  match: string;
  snippet: string;
};

type Rule = {
  id: string;
  pattern: RegExp;
  message: string;
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const SKIP_DIRS = new Set(["__tests__", "node_modules", "dist", ".git"]);
const EXTS = new Set([".ts", ".tsx", ".css"]);

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      // eslint-disable-next-line eslint/no-await-in-loop -- recursive walk requires sequential awaits
      out.push(...(await walk(join(dir, entry.name))));
    } else if (EXTS.has(extname(entry.name))) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const RULES: Rule[] = [
  {
    id: "no-bg-gradient",
    pattern: /\bbg-gradient-[\w-]+/g,
    message: "Tailwind 渐变背景被禁用。整屏只使用 token 颜色。",
  },
  {
    id: "no-raw-shadow",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b/g,
    message: "只允许 shadow-overlay 与 shadow-none。",
  },
  {
    id: "no-hardcoded-color-bg",
    pattern:
      /\bbg-(?:gray|blue|green|red|orange|yellow|pink|purple|cyan|teal|indigo|sky|rose|amber|emerald|fuchsia|lime|violet|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message:
      "硬编码彩色背景被禁用。使用 token: bg-canvas / bg-surface / bg-surface-raised / bg-accent。",
  },
  {
    id: "no-hardcoded-color-text",
    pattern:
      /\btext-(?:blue|green|red|orange|yellow|pink|purple|cyan|teal|indigo|sky|rose|amber|emerald|fuchsia|lime|violet|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message:
      "硬编码彩色文字被禁用。使用 token: text-text-primary / text-text-secondary / text-text-tertiary / text-accent / text-danger / text-warning / text-success。",
  },
  {
    id: "no-hardcoded-color-border",
    pattern:
      /\bborder-(?:blue|green|red|orange|yellow|pink|purple|gray|slate|zinc|neutral|stone)-\d{2,3}\b/g,
    message:
      "硬编码彩色边框被禁用。使用 token: border-border-subtle / border-border-default / border-accent / border-danger。",
  },
];

async function main() {
  const files = await walk(SRC);
  const violations: Violation[] = [];

  for (const file of files) {
    // eslint-disable-next-line eslint/no-await-in-loop -- sequential file reads for audit
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(content)) !== null) {
        const before = content.slice(0, match.index);
        const line = before.split("\n").length;
        const lineText = lines[line - 1]?.trim() ?? "";
        violations.push({
          rule: rule.id,
          message: rule.message,
          file: relative(ROOT, file),
          line,
          match: match[0],
          snippet: lineText,
        });
      }
    }
  }

  if (violations.length === 0) {
    console.log("Visual audit passed - no violations found");
    console.log(`   checked ${files.length} file(s), ${RULES.length} rule(s)`);
    process.exit(0);
  }

  console.error(`Visual audit failed - ${violations.length} violation(s)\n`);
  const byRule = new Map<string, Violation[]>();
  for (const violation of violations) {
    if (!byRule.has(violation.rule)) byRule.set(violation.rule, []);
    byRule.get(violation.rule)?.push(violation);
  }
  for (const [rule, list] of byRule) {
    console.error(`[${rule}] - ${list[0].message}`);
    for (const violation of list) {
      console.error(`  ${violation.file}:${violation.line}  ${violation.match}`);
      console.error(`    ${violation.snippet}`);
    }
    console.error("");
  }
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(2);
});
