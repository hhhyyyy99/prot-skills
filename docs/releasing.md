# Releasing Prot Skills

Prot Skills releases are driven by a version bump commit, a matching release
notes file, and a `v*` git tag that triggers the GitHub release workflow.

## One-Time Facts

- Workflow: `.github/workflows/release.yml`
- Trigger: push a tag named `vX.Y.Z`
- Release notes source: `docs/releases/vX.Y.Z.md`
- Release asset naming pattern:
  `Prot-Skills-v[version]-[platform]-[arch][setup][ext]`
- Output: draft GitHub Release with desktop bundles for macOS, Linux, and
  Windows

## Standard Release Flow

1. Start from an up-to-date `main` branch with a clean working tree.
2. Run `pnpm release:version patch|minor|major`.
3. Copy `docs/releases/TEMPLATE.md` to `docs/releases/vX.Y.Z.md`.
4. Fill in user-facing release notes for that version.
5. Run local verification:

   ```sh
   pnpm test
   pnpm build
   cd src-tauri && cargo test
   ```

6. Push the version bump commit to `main`.
7. Create and push the tag with `pnpm release:tag vX.Y.Z`.
8. Wait for the GitHub Actions release workflow to finish.
9. Open the draft release, verify the assets and notes, then publish it.

## Notes Format

Use these sections in every release note:

- `Highlights`
- `Added`
- `Changed`
- `Fixed`
- `Known Issues`
- `Download Notes`

Keep the opening summary and the bullet points user-facing. Internal refactors
only belong in release notes if they improve reliability, packaging, or user
behavior in a visible way.

## Expected Asset Names

GitHub release assets now use a product-style naming pattern instead of the
default Tauri upload names. Example outputs for `v0.0.4` may look like:

- `Prot-Skills-v0.0.4-macos-x86_64.dmg`
- `Prot-Skills-v0.0.4-macos-aarch64.dmg`
- `Prot-Skills-v0.0.4-linux-x86_64.AppImage`
- `Prot-Skills-v0.0.4-windows-x86_64-setup.exe`

The exact extensions still depend on the bundle type Tauri produces for each
platform.

## Failure Modes

### Missing release notes file

If the workflow fails early with a missing file error, create the expected file:

```text
docs/releases/vX.Y.Z.md
```

The filename must exactly match the release tag.

### Tag exists locally but not on origin

Push the tag manually:

```sh
git push origin vX.Y.Z
```

### Draft release exists but notes look incomplete

Update `docs/releases/vX.Y.Z.md`, then rerun the workflow or recreate the tag
only if that is safe for the current release state. In normal cases, it is
better to edit the draft release in GitHub only after confirming the source note
should also be updated in the repository.
