import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootFromScript = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function humanizePackageName(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function detectLineEnding(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function normalizeLineEndings(content, lineEnding) {
  return content.replace(/\r?\n/g, lineEnding);
}

function serializeJsonLike(value, currentContent) {
  return normalizeLineEndings(serializeJson(value), detectLineEnding(currentContent));
}

function replacePackageField(content, field, value) {
  const lineEnding = detectLineEnding(content);
  const headerMatch = content.match(/\[package\]\r?\n/);
  if (!headerMatch || headerMatch.index === undefined) {
    throw new Error("Cargo.toml is missing a [package] section");
  }

  const header = headerMatch[0];
  const headerStart = headerMatch.index;
  const bodyStart = headerStart + header.length;
  const nextSectionOffset = content.slice(bodyStart).search(/\r?\n\[/);
  const bodyEnd =
    nextSectionOffset === -1 ? content.length : bodyStart + nextSectionOffset + lineEnding.length;
  const body = content.slice(bodyStart, bodyEnd);
  const fieldPattern = new RegExp(`^${field}\\s*=\\s*".*"$`);
  const lines = body.split(/\r?\n/);
  let replaced = false;
  const nextLines = [];

  for (const line of lines) {
    if (fieldPattern.test(line)) {
      if (!replaced) {
        nextLines.push(`${field} = ${JSON.stringify(value)}`);
        replaced = true;
      }
      continue;
    }
    nextLines.push(line);
  }

  const nextBody = replaced
    ? nextLines.join(lineEnding)
    : `${field} = ${JSON.stringify(value)}${lineEnding}${body}`;

  return `${content.slice(0, headerStart)}${header}${nextBody}${content.slice(bodyEnd)}`;
}

function updateCargoToml(content, packageJson) {
  return replacePackageField(
    replacePackageField(content, "name", packageJson.name),
    "version",
    packageJson.version,
  );
}

function updateTauriConfig(config, packageJson) {
  const productName = packageJson.productName ?? humanizePackageName(packageJson.name);
  const windows = Array.isArray(config.app?.windows)
    ? config.app.windows.map((windowConfig) => ({ ...windowConfig, title: productName }))
    : config.app?.windows;

  return {
    ...config,
    productName,
    version: packageJson.version,
    build: {
      ...config.build,
      beforeDevCommand: "pnpm dev",
      beforeBuildCommand: "pnpm build",
    },
    app: {
      ...config.app,
      windows,
    },
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeIfChanged(filePath, nextContent, check) {
  const currentContent = await readFile(filePath, "utf8");
  if (currentContent === nextContent) return false;
  if (!check) await writeFile(filePath, nextContent);
  return true;
}

export async function syncAppMetadata({ rootDir = rootFromScript, check = false } = {}) {
  const packagePath = path.join(rootDir, "package.json");
  const tauriConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
  const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");

  const packageJson = await readJson(packagePath);
  const tauriConfigContent = await readFile(tauriConfigPath, "utf8");
  const tauriConfig = JSON.parse(tauriConfigContent);
  const cargoToml = await readFile(cargoTomlPath, "utf8");

  if (!packageJson.name || !packageJson.version) {
    throw new Error("package.json must define name and version");
  }

  const changes = [
    {
      label: "src-tauri/tauri.conf.json",
      filePath: tauriConfigPath,
      content: serializeJsonLike(updateTauriConfig(tauriConfig, packageJson), tauriConfigContent),
    },
    {
      label: "src-tauri/Cargo.toml",
      filePath: cargoTomlPath,
      content: updateCargoToml(cargoToml, packageJson),
    },
  ];

  const changed = [];
  for (const change of changes) {
    // eslint-disable-next-line eslint/no-await-in-loop -- sequential writes to track changed files
    if (await writeIfChanged(change.filePath, change.content, check)) {
      changed.push(change.label);
    }
  }

  return {
    changed,
    inSync: changed.length === 0,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const result = await syncAppMetadata({ check });
  if (result.inSync) {
    console.log("App metadata is in sync.");
  } else if (check) {
    console.error(`App metadata is out of sync: ${result.changed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Synced app metadata: ${result.changed.join(", ")}`);
  }
}
