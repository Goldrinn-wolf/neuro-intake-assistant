param([string]$OutputName='神内问诊助手_Windows桌面版',[switch]$Lite)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$target=Join-Path $root ('outputs/'+$OutputName)
$sdk=Join-Path $PSScriptRoot 'compat/sdk'
if(!(Test-Path "$sdk/lib/net45/Microsoft.Web.WebView2.Core.dll")){throw '先下载并解压 Microsoft.Web.WebView2 1.0.1518.46 NuGet 包到 work/desktop/compat/sdk'}
New-Item -ItemType Directory -Force -Path "$target/www/assistant" | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'outputs/查房联动演示/index.html') -Destination "$target/www/index.html"
Get-ChildItem -LiteralPath (Join-Path $root 'outputs/查房联动演示/assistant') -File | Copy-Item -Destination "$target/www/assistant" -Force
foreach($name in @('Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll')){Copy-Item -LiteralPath "$sdk/lib/net45/$name" -Destination $target -Force}
foreach($arch in @('x86','x64')){
 New-Item -ItemType Directory -Force -Path "$target/runtimes/win-$arch/native" | Out-Null
 Copy-Item -LiteralPath "$sdk/runtimes/win-$arch/native/WebView2Loader.dll" -Destination "$target/runtimes/win-$arch/native" -Force
}
Copy-Item -LiteralPath "$sdk/LICENSE.txt" -Destination "$target/WebView2-SDK-LICENSE.txt" -Force
Copy-Item -LiteralPath "$PSScriptRoot/app.config" -Destination "$target/神内问诊助手.exe.config" -Force
Copy-Item -LiteralPath "$PSScriptRoot/使用说明.txt" -Destination $target -Force
if(!$Lite){
 foreach($arch in @('x86','x64')){
  $runtime=Join-Path $PSScriptRoot "compat/payload-$arch/Chrome-bin/109.0.1518.140"
  if(!(Test-Path "$runtime/msedgewebview2.exe")){throw "缺少微软 Runtime 109 的 $arch 离线文件"}
  New-Item -ItemType Directory -Force -Path "$target/runtime109/$arch" | Out-Null
  Get-ChildItem -LiteralPath $runtime | Copy-Item -Destination "$target/runtime109/$arch" -Recurse -Force
 }
 New-Item -ItemType Directory -Force -Path "$target/环境安装" | Out-Null
 Copy-Item -LiteralPath "$PSScriptRoot/compat/dotnet462.exe" -Destination "$target/环境安装/NET-Framework-4.6.2.exe" -Force
}
$source=Join-Path $PSScriptRoot 'DesktopApp.cs'
$manifest=Join-Path $PSScriptRoot 'app.manifest'
$exe=Join-Path $target '神内问诊助手.exe'
$core=Join-Path $target 'Microsoft.Web.WebView2.Core.dll'
$forms=Join-Path $target 'Microsoft.Web.WebView2.WinForms.dll'
$icon=Join-Path $PSScriptRoot 'app.ico'
& 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe' /nologo /target:winexe /platform:anycpu /optimize+ /utf8output "/win32icon:$icon" "/win32manifest:$manifest" "/out:$exe" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll "/reference:$core" "/reference:$forms" "$source"
if($LASTEXITCODE -ne 0){throw 'Native build failed'}
Get-Item -LiteralPath "$target/神内问诊助手.exe" | Select-Object Name,Length
