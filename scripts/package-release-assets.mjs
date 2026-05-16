/**
 * package-release-assets.mjs
 *
 * Takes Tauri build output and produces CC-Switch-style named release assets.
 *
 * Usage:
 *   node scripts/package-release-assets.mjs <version> <os-label> <arch-label> <bundle-dir> <output-dir>
 *
 * Example:
 *   node scripts/package-release-assets.mjs 0.1.0 Linux -x86_64 \
 *     src-tauri/target/release/bundle release-artifacts
 *
 * Naming convention (matching CC-Switch):
 *   Prot-Skills-v0.1.0-macOS.dmg
 *   Prot-Skills-v0.1.0-macOS.tar.gz
 *   Prot-Skills-v0.1.0-Linux-x86_64.AppImage
 *   Prot-Skills-v0.1.0-Linux-x86_64.deb
 *   Prot-Skills-v0.1.0-Linux-x86_64.rpm
 *   Prot-Skills-v0.1.0-Windows-x86_64.msi
 *   Prot-Skills-v0.1.0-Windows-Portable.zip
 */

import { readdir, copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

function usage() {
  console.error(`Usage: node scripts/package-release-assets.mjs <version> <os-label> <arch-label> <bundle-dir> <output-dir>

  <version>     App version (e.g. 0.1.0)
  <os-label>    OS label for filename (macOS | Linux | Windows)
  <arch-label>  Architecture suffix (-x86_64 | -aarch64 | "" for macOS)
  <bundle-dir>  Path to Tauri bundle output (src-tauri/target/release/bundle)
  <output-dir>  Where renamed artifacts will be placed`);
  process.exit(1);
}

const args = process.argv.slice(2);
const [version, osLabel, archLabel, bundleDir, outputDir] = args;

if (!version || !osLabel || !bundleDir || !outputDir) {
  usage();
}

await mkdir(outputDir, { recursive: true });

const PREFIX = `Prot-Skills-v${version}-${osLabel}${archLabel}`;
const APP_NAME = "Prot Skills";
const created = [];

async function copyArtifact(srcPath, suffix) {
  const ext = path.extname(srcPath);
  const destName = `${PREFIX}${suffix || ext}`;
  const destPath = path.join(outputDir, destName);
  await copyFile(srcPath, destPath);
  created.push(destName);
}

function createTarGz(sourceDir, sourceName, outputName) {
  const tarPath = path.join(outputDir, `${outputName}.tar.gz`);
  execSync(`tar czf "${tarPath}" -C "${sourceDir}" "${sourceName}"`, {
    stdio: "pipe",
    timeout: 120_000,
  });
  created.push(`${outputName}.tar.gz`);
}

function createZip(sourcePath, outputName) {
  const zipPath = path.join(outputDir, `${outputName}.zip`);
  execSync(`zip -j "${zipPath}" "${sourcePath}"`, { stdio: "pipe", timeout: 120_000 });
  created.push(`${outputName}.zip`);
}

// ── macOS ──────────────────────────────────────────────────────────
/* eslint-disable eslint/no-await-in-loop -- sequential file copies for release packaging */
if (osLabel === "macOS") {
  // .dmg
  const dmgDir = path.join(bundleDir, "dmg");
  if (existsSync(dmgDir)) {
    const files = await readdir(dmgDir);
    for (const f of files) {
      if (f.endsWith(".dmg")) {
        await copyArtifact(path.join(dmgDir, f), "");
      }
    }
  }

  // .tar.gz from .app bundle (extra format, like CC-Switch provides)
  const macosDir = path.join(bundleDir, "macos");
  if (existsSync(macosDir)) {
    const appBundle = path.join(macosDir, `${APP_NAME}.app`);
    if (existsSync(appBundle)) {
      createTarGz(macosDir, `${APP_NAME}.app`, `${PREFIX}`);
    }
  }
}

// ── Linux ──────────────────────────────────────────────────────────
if (osLabel === "Linux") {
  for (const subdir of ["deb", "rpm", "appimage"]) {
    const dir = path.join(bundleDir, subdir);
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const st = await stat(fullPath);
      if (!st.isFile()) continue;
      await copyArtifact(fullPath, "");
    }
  }
}

// ── Windows ────────────────────────────────────────────────────────
if (osLabel === "Windows") {
  // .msi
  const msiDir = path.join(bundleDir, "msi");
  if (existsSync(msiDir)) {
    const files = await readdir(msiDir);
    for (const f of files) {
      if (f.endsWith(".msi")) {
        await copyArtifact(path.join(msiDir, f), "");
      }
    }
  }

  // .exe (NSIS installer)
  const nsisDir = path.join(bundleDir, "nsis");
  if (existsSync(nsisDir)) {
    const files = await readdir(nsisDir);
    for (const f of files) {
      if (f.endsWith(".exe")) {
        await copyArtifact(path.join(nsisDir, f), "");
      }
    }
  }

  // Portable .zip (extra format, like CC-Switch -Portable.zip)
  const releaseDir = path.resolve(bundleDir, "..");
  const exeName = `${APP_NAME}.exe`;
  const exePath = path.join(releaseDir, exeName);
  if (existsSync(exePath)) {
    createZip(exePath, `${PREFIX}-Portable`);
  }
}
/* eslint-enable eslint/no-await-in-loop */

// ── Output ─────────────────────────────────────────────────────────
console.log("=== Packaged release assets ===");
for (const name of created.toSorted()) {
  console.log(`  ${name}`);
}
console.log(`→ ${outputDir}/ (${created.length} files)`);

// Set output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  // … already printed above; action reads from stdout if needed
}
