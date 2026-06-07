# TIMBA! Windows Packaging

TIMBA! now has Windows packaging wired through `electron-builder`.

## Generated Artifacts

Current local artifacts:

- Portable: `dist/TIMBA-Portable-0.2.0-x64.exe`
- Installer: `dist/TIMBA-Setup-0.2.0-x64.exe`
- Unpacked app folder: `dist/win-unpacked/`

For testers, send one of these:

- `TIMBA-Setup-0.2.0-x64.exe` for a normal install flow.
- `TIMBA-Portable-0.2.0-x64.exe` for quick no-install testing.

## Commands

Build and package both Windows targets:

```powershell
npm run dist
```

Build only the portable `.exe`:

```powershell
npm run dist:portable
```

Build only the installer:

```powershell
npm run dist:installer
```

Validate rules and structure:

```powershell
npm run validate
```

## Local Windows Note

On this machine, `npm` is not always available in `PATH`. The working npm used for packaging was:

```powershell
C:\Users\nicol\AppData\Local\fnm_multishells\8108_1778963866989\npm.cmd
```

If plain `npm run dist:portable` fails with `npm no se reconoce`, use that npm path or open a terminal where Node/npm is correctly initialized.

## Current Packaging Config

The `package.json` build config defines:

- `appId`: `com.timba.game`
- `productName`: `TIMBA!`
- output directory: `dist/`
- Windows targets: `nsis` and `portable`

The current build disables Windows executable editing/signing with:

```json
"signAndEditExecutable": false
```

Reason: Windows blocked `winCodeSign` cache extraction because the account/session could not create symlinks. This is acceptable for internal tester builds, but it means:

- the app uses the default Electron icon for now;
- the `.exe` is unsigned;
- Windows SmartScreen may warn testers.

## Release Checklist

Before sending a build:

- Run `npm run validate`.
- Run `npm run dist:installer` or `npm run dist:portable`.
- Open the generated artifact once locally.
- Confirm the main menu appears without a dev server.
- Tell testers this is an unsigned prototype build.

## Next Packaging Improvements

- Add a real `.ico` app icon.
- Re-enable executable metadata/icon editing once Windows symlink permissions are solved.
- Add code signing if the game will be distributed beyond trusted testers.
- Consider versioning artifacts as `0.2.0`, `0.3.0`, etc. per playtest build.
