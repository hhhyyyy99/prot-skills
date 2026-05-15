# Prot Skills vX.Y.Z

Short summary of what this release improves for users.

## Highlights

- Highlight the most important workflow, UX, or packaging improvement.
- Mention the biggest fix or reliability gain.

## Added

- New user-facing capability.

## Changed

- Existing behavior that now works differently.

## Fixed

- Bug fix with visible impact.

## Known Issues

- macOS builds are not signed yet. If Gatekeeper blocks the app, remove the
  quarantine attribute:

  ```sh
  xattr -d com.apple.quarantine "/Applications/Prot Skills.app"
  ```

## Download Notes

- Download the asset that matches your platform from the release assets below.
- Windows and Linux packages may use different installer formats depending on
  the build target produced by Tauri.
