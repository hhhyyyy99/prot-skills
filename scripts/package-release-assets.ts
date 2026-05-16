import { readdir, copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ReleaseArgs = {
  version: string;
  osLabel: string;
  archLabel: string;
  bundleDir: string;
  outputDir: string;
};

function usage() {
  console.error(`Usage: tsx scripts/package-release-assets.ts <version> <os-label> <arch-label> <bundle-dir> <output-dir>

  <version>     App version (e.g. 0.1.0)
  <os-label>    OS label for filename (macOS | Linux | Windows)
  <arch-label>  Architecture suffix (-x86_64 | -aarch64 | "" for macOS)
  <bundle-dir>  Path to Tauri bundle output (src-tauri/target/release/bundle)
  <output-dir>  Where renamed artifacts will be placed`);
  process.exit(1);
}

function parseArgs(args: string[]): ReleaseArgs {
  const [version, osLabel, archLabel, bundleDir, outputDir] = args;

  if (!version || !osLabel || !bundleDir || !outputDir) {
    usage();
  }

  return {
    version,
    osLabel,
    archLabel: archLabel ?? "",
    bundleDir,
    outputDir,
  };
}

export async function packageReleaseAssets({
  version,
  osLabel,
  archLabel,
  bundleDir,
  outputDir,
}: ReleaseArgs) {
  await mkdir(outputDir, { recursive: true });

  const prefix = `Prot-Skills-v${version}-${osLabel}${archLabel}`;
  const appName = "Prot Skills";
  const created: string[] = [];

  async function copyArtifact(srcPath: string, suffix: string) {
    const ext = path.extname(srcPath);
    const destName = `${prefix}${suffix || ext}`;
    const destPath = path.join(outputDir, destName);
    await copyFile(srcPath, destPath);
    created.push(destName);
  }

  function createTarGz(sourceDir: string, sourceName: string, outputName: string) {
    const tarPath = path.join(outputDir, `${outputName}.tar.gz`);
    execSync(`tar czf "${tarPath}" -C "${sourceDir}" "${sourceName}"`, {
      stdio: "pipe",
      timeout: 120_000,
    });
    created.push(`${outputName}.tar.gz`);
  }

  function createZip(sourcePath: string, outputName: string) {
    const zipPath = path.join(outputDir, `${outputName}.zip`);
    execSync(`zip -j "${zipPath}" "${sourcePath}"`, { stdio: "pipe", timeout: 120_000 });
    created.push(`${outputName}.zip`);
  }

  if (osLabel === "macOS") {
    const dmgDir = path.join(bundleDir, "dmg");
    if (existsSync(dmgDir)) {
      const files = await readdir(dmgDir);
      for (const file of files) {
        if (file.endsWith(".dmg")) {
          await copyArtifact(path.join(dmgDir, file), "");
        }
      }
    }

    const macosDir = path.join(bundleDir, "macos");
    if (existsSync(macosDir)) {
      const appBundle = path.join(macosDir, `${appName}.app`);
      if (existsSync(appBundle)) {
        createTarGz(macosDir, `${appName}.app`, prefix);
      }
    }
  }

  if (osLabel === "Linux") {
    for (const subdir of ["deb", "rpm", "appimage"]) {
      const dir = path.join(bundleDir, subdir);
      if (!existsSync(dir)) continue;
      const files = await readdir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const fileStat = await stat(fullPath);
        if (!fileStat.isFile()) continue;
        await copyArtifact(fullPath, "");
      }
    }
  }

  if (osLabel === "Windows") {
    const msiDir = path.join(bundleDir, "msi");
    if (existsSync(msiDir)) {
      const files = await readdir(msiDir);
      for (const file of files) {
        if (file.endsWith(".msi")) {
          await copyArtifact(path.join(msiDir, file), "");
        }
      }
    }

    const nsisDir = path.join(bundleDir, "nsis");
    if (existsSync(nsisDir)) {
      const files = await readdir(nsisDir);
      for (const file of files) {
        if (file.endsWith(".exe")) {
          await copyArtifact(path.join(nsisDir, file), "");
        }
      }
    }

    const releaseDir = path.resolve(bundleDir, "..");
    const exeName = `${appName}.exe`;
    const exePath = path.join(releaseDir, exeName);
    if (existsSync(exePath)) {
      createZip(exePath, `${prefix}-Portable`);
    }
  }

  console.log("=== Packaged release assets ===");
  const sortedCreated = [...created].toSorted();
  for (const name of sortedCreated) {
    console.log(`  ${name}`);
  }
  console.log(`-> ${outputDir}/ (${created.length} files)`);

  return sortedCreated;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await packageReleaseAssets(parseArgs(process.argv.slice(2)));
}
