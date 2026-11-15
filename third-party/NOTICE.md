# Third-party components

The application's own source and Microsoft redistributables are separate works. No project-wide third-party license is replaced by publishing this repository.

- WebView2 SDK **1.0.1518.46**: official NuGet package; license retained in `WebView2-SDK-LICENSE.txt`.
- WebView2 Runtime **109.0.1518.140**, x86/x64: Microsoft-signed binaries from Microsoft Update Catalog, included in the full Windows archive for legacy compatibility. Runtime components retain Microsoft's and their included third-party terms; they are not project source code. Original runtime resources and notices remain in the archive.
- .NET Framework **4.6.2**: unmodified Microsoft offline redistributable installer, with its own embedded license and installation UI.

Official guidance: [WebView2 distribution](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution), [runtime components](https://learn.microsoft.com/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version), [.NET redistribution](https://learn.microsoft.com/dotnet/framework/install/guide-for-developers), [Windows 7 limit](https://blogs.windows.com/msedgedev/2022/12/09/microsoft-edge-and-webview2-ending-support-for-windows-7-and-windows-8-8-1/).

Redistributables are release assets, not vendored into Git history. Original download locations and SHA256 values are listed in the full archive's dependency manifest.
