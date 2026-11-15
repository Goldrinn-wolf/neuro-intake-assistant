# Build the Windows desktop application

Use Windows PowerShell 5+ or PowerShell 7, Python 3.11+, Node.js and the .NET Framework C# compiler on Windows. The frontend itself has no npm dependencies.

```powershell
python work/desktop/fetch-dependencies.py
python work/neuro-intake/content.py
python work/desktop/prepare_desktop.py
./work/desktop/build-desktop.ps1 -OutputName NeuroIntake-Windows -Lite
```

`fetch-dependencies.py` downloads only the pinned official WebView2 SDK by default. The lightweight build requires an appropriate installed WebView2 runtime to run. To build the full legacy-compatible package, use `fetch-dependencies.py --full`; it obtains the Microsoft .NET 4.6.2 installer, Microsoft Update Catalog Runtime 109 payloads and the official 7-Zip extraction tool. Verify Microsoft Authenticode signatures before distributing downloaded installers and runtime executables. Runtime 109 has stopped receiving updates.

```powershell
./work/desktop/build-desktop.ps1 -OutputName NeuroIntake-Windows-Full
```

The full build preserves runtime binaries and their original resources. Generated SDK files, executables, runtime binaries, profiles and archives are excluded from Git. The Windows release archive includes the original component provenance manifest and license files.

Regression checks (from repository root):

```powershell
node work/neuro-intake/verify-composition.cjs
node work/neuro-intake/verify-common-stories.cjs
node work/neuro-intake/verify-entry-catalog.cjs
node work/neuro-intake/verify-clinical-edges.cjs
node work/neuro-intake/verify-desktop-copy.cjs
```

For a browser-only preview, serve `outputs/查房联动演示` with a local static HTTP server and open `/assistant/`. Run only with fictional data when demonstrating or sharing screenshots.
