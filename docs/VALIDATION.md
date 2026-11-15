# Validation scope

Current regression checks: `verify-composition.cjs`, `verify-common-stories.cjs`, `verify-entry-catalog.cjs`, `verify-clinical-edges.cjs`, `verify-desktop-copy.cjs` in `work/neuro-intake/`.

The desktop release was exercised on the current Windows system with its installed modern WebView2 runtime, the bundled x64 Runtime 109, and a temporary x86 build using bundled x86 Runtime 109. Manual checks included symptom selection, a fictional vertigo encounter, examination selections, persistence after restart, side-by-side review, clipboard transfer to a fictional hospital page, keyboard copy shortcuts and narrow-window layout.

Native Windows 7, a 32-bit Windows operating system and real hospital editors were not validated. Compatibility is a target, not a completed certification. Microsoft no longer updates Windows 7 or WebView2 109. Only fictional demonstration cases are committed.
