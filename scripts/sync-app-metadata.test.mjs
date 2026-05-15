import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { syncAppMetadata } from './sync-app-metadata.mjs';

async function writeFixture(rootDir) {
  await mkdir(path.join(rootDir, 'src-tauri'), { recursive: true });
  await writeFile(
    path.join(rootDir, 'package.json'),
    JSON.stringify(
      {
        name: 'sample-app',
        productName: 'Sample App',
        version: '2.3.4',
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
    JSON.stringify(
      {
        identifier: 'com.example.sample',
        build: {
          beforeDevCommand: 'npm run dev',
          beforeBuildCommand: 'npm run build',
        },
        app: {
          windows: [{ title: 'Old Name' }],
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(rootDir, 'src-tauri', 'Cargo.toml'),
    [
      '[package]',
      'name = "old-name"',
      'version = "0.0.1"',
      'description = "Fixture"',
      'edition = "2021"',
      '',
      '[dependencies]',
      'tauri = "2"',
      '',
    ].join('\n'),
  );
}

describe('syncAppMetadata', () => {
  it('syncs package metadata into Tauri and Cargo manifests', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'sync-app-metadata-'));
    await writeFixture(rootDir);

    const result = await syncAppMetadata({ rootDir });

    expect(result.changed).toEqual([
      'src-tauri/tauri.conf.json',
      'src-tauri/Cargo.toml',
    ]);

    const tauriConfig = JSON.parse(await readFile(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));
    expect(tauriConfig.productName).toBe('Sample App');
    expect(tauriConfig.version).toBe('2.3.4');
    expect(tauriConfig.app.windows[0].title).toBe('Sample App');
    expect(tauriConfig.build.beforeDevCommand).toBe('pnpm dev');
    expect(tauriConfig.build.beforeBuildCommand).toBe('pnpm build');

    const cargoToml = await readFile(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
    expect(cargoToml).toContain('name = "sample-app"');
    expect(cargoToml).toContain('version = "2.3.4"');
    expect(cargoToml).not.toContain('name = "old-name"');
    expect(cargoToml).not.toContain('version = "0.0.1"');
    expect(cargoToml.match(/^name = /gm)).toHaveLength(1);
    expect(cargoToml.match(/^version = /gm)).toHaveLength(1);
  });

  it('reports drift without writing files in check mode', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'sync-app-metadata-'));
    await writeFixture(rootDir);

    const result = await syncAppMetadata({ rootDir, check: true });

    expect(result.inSync).toBe(false);
    expect(result.changed).toEqual([
      'src-tauri/tauri.conf.json',
      'src-tauri/Cargo.toml',
    ]);

    const tauriConfig = JSON.parse(await readFile(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));
    expect(tauriConfig.productName).toBeUndefined();
  });

  it('removes duplicate Cargo package fields while syncing', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'sync-app-metadata-'));
    await writeFixture(rootDir);
    await writeFile(
      path.join(rootDir, 'src-tauri', 'Cargo.toml'),
      [
        '[package]',
        'version = "0.0.1"',
        'name = "old-name"',
        'version = "0.0.2"',
        'edition = "2021"',
        '',
      ].join('\n'),
    );

    await syncAppMetadata({ rootDir });

    const cargoToml = await readFile(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
    expect(cargoToml.match(/^name = /gm)).toHaveLength(1);
    expect(cargoToml.match(/^version = /gm)).toHaveLength(1);
    expect(cargoToml).toContain('name = "sample-app"');
    expect(cargoToml).toContain('version = "2.3.4"');
  });

  it('supports Cargo.toml files with CRLF line endings', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'sync-app-metadata-'));
    await writeFixture(rootDir);
    await writeFile(
      path.join(rootDir, 'src-tauri', 'Cargo.toml'),
      [
        '[package]',
        'name = "old-name"',
        'version = "0.0.1"',
        'edition = "2021"',
        '',
        '[dependencies]',
        'tauri = "2"',
        '',
      ].join('\r\n'),
    );

    const result = await syncAppMetadata({ rootDir });

    expect(result.changed).toContain('src-tauri/Cargo.toml');

    const cargoToml = await readFile(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
    expect(cargoToml).toContain('[package]\r\n');
    expect(cargoToml).toContain('name = "sample-app"\r\n');
    expect(cargoToml).toContain('version = "2.3.4"\r\n');
  });

  it('treats CRLF tauri.conf.json as in sync when only line endings differ', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'sync-app-metadata-'));
    await writeFixture(rootDir);
    await syncAppMetadata({ rootDir });

    const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
    const tauriConfig = await readFile(tauriConfigPath, 'utf8');
    await writeFile(tauriConfigPath, tauriConfig.replace(/\n/g, '\r\n'));

    const result = await syncAppMetadata({ rootDir, check: true });

    expect(result.inSync).toBe(true);
    expect(result.changed).toEqual([]);
  });
});
