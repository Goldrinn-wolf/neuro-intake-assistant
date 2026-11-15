# 临床拾问 · 神内问诊与查体助手

**中文 · English · Deutsch**

## 中文

面向神经内科临床记录的离线桌面助手：先选主要症状，再按表现进入问诊分支，通过点选和少量输入生成连贯的现病史及实际查体所见。包括 **11 类主要症状、30 个问诊分支**，以及按顺序展开的神经系统查体、操作提示、替代方法和病史相关重点标记。

- 点选和文字输入自动保存在本机；未查、未记录不会自动写成正常。
- 最终现病史与查体并排核对，可修改措辞，并分别或整份复制到医院病历。
- 支持接诊备份/恢复、贴边填写、窗口置顶和查房准备。
- 演示病例为虚构；生成文字需由使用者结合实际问诊、查体核对。

**下载：** [最新 Windows 发布包](https://github.com/Goldrinn-wolf/neuro-intake-assistant/releases/latest)。完整包含 x86/x64 Runtime 109 与 .NET Framework 4.6.2 离线安装程序；轻量包不含这些运行环境，功能相同。完整解压后运行 `神内问诊助手.exe`。

**系统：** WinForms、.NET Framework 4.6.2 或更高版本，兼容目标为 Windows 7 SP1 及以上。Win7 使用 WebView2 109；现代系统优先使用已安装的新版本 WebView2。当前 Windows 上已验证新版内核、109 x64 及临时 x86 构建；**Windows 7 实机仍待验证**。Win7 与 Runtime 109 已停止更新。

用户记录位于 `%LOCALAPPDATA%/NeuroIntakeDesktop/Profile`，不随源码或发布包上传。网页预览和桌面应用存储独立，可用备份文件转移。

## English

An offline Windows assistant for neurological history taking, examination and clinical note preparation. Select a chief symptom, follow one of **30 interview branches across 11 symptom categories**, and use clicks with minimal typing to compose a chronological history and the examination findings actually recorded.

Entries save locally. Unperformed or undocumented examinations are never converted into normal findings. The desktop offers side-by-side review, separate or combined copy buttons, backup/restore, optional examination instructions and alternatives, and history-based examination highlights. Demonstration cases are fictional; clinicians review the generated text against their actual findings before use.

Download the [latest Windows release](https://github.com/Goldrinn-wolf/neuro-intake-assistant/releases/latest). The full package includes x86/x64 WebView2 Runtime 109 and the .NET Framework 4.6.2 offline installer. The lightweight package provides the same application without these dependencies. Extract the complete folder and run `神内问诊助手.exe`.

Compatibility target: Windows 7 SP1 or later, .NET Framework 4.6.2+. Windows 7 requires Runtime 109; newer Windows versions prefer an installed, updated WebView2 runtime. Runtime 109 has been exercised on the current Windows system, including an x86 test build; **native Windows 7 validation remains pending**. Windows 7 and Runtime 109 no longer receive updates. Encounter records remain in the local application profile and are excluded from this repository and its downloads.

## Deutsch

Ein offline nutzbarer Windows-Assistent für die neurologische Anamnese, Untersuchung und Vorbereitung klinischer Dokumentation. Nach Auswahl des Leitsymptoms stehen **30 Anamnesepfade in 11 Symptomgruppen** bereit. Durch Anklicken und wenige Texteingaben entstehen ein chronologischer Anamnesetext und die tatsächlich dokumentierten Untersuchungsbefunde.

Eingaben werden lokal gespeichert. Nicht untersuchte oder nicht dokumentierte Punkte werden niemals automatisch als unauffällig ausgegeben. Die Desktop-Oberfläche bietet eine Prüfung von Anamnese und Befund nebeneinander, getrenntes oder gemeinsames Kopieren, Sicherung/Wiederherstellung, optionale Untersuchungshinweise und Alternativen sowie Hervorhebungen anhand der Anamnese. Die Beispielfälle sind fiktiv; die erzeugten Texte müssen mit den tatsächlichen Angaben und Befunden abgeglichen werden.

Die [aktuelle Windows-Veröffentlichung](https://github.com/Goldrinn-wolf/neuro-intake-assistant/releases/latest) enthält ein Vollpaket mit WebView2 Runtime 109 für x86/x64 und dem Offline-Installationsprogramm für .NET Framework 4.6.2. Das kleine Paket bietet dieselben Funktionen ohne diese Laufzeitkomponenten. Den gesamten Ordner entpacken und `神内问诊助手.exe` starten.

Kompatibilitätsziel: Windows 7 SP1 oder neuer mit .NET Framework 4.6.2+. Windows 7 benötigt Runtime 109; neuere Windows-Versionen verwenden bevorzugt eine installierte aktuelle WebView2-Laufzeit. Runtime 109 wurde auf dem aktuellen Windows-System einschließlich eines x86-Testbuilds geprüft; **ein Test auf einem tatsächlichen Windows-7-System steht noch aus**. Windows 7 und Runtime 109 erhalten keine Updates mehr. Lokale Falldaten sind weder im Repository noch in den Downloads enthalten.

## Desktop preview / Desktop-Vorschau

![Desktop note review](docs/screenshots/desktop-preview.png)

## Source and build / 源码与构建 / Quellcode und Build

- `work/neuro-intake/`: interview content generators, frontend, note composition and current regression checks.
- `work/desktop/`: WinForms host, manifest, configuration and desktop build scripts.
- `outputs/查房联动演示/`: generated local frontend and four fictional teaching vignettes required by the content generator.
- [Build instructions](docs/BUILD.md) · [Dependencies and notices](third-party/NOTICE.md) · [Validation scope](docs/VALIDATION.md).
