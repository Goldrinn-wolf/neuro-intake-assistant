from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
app=root/'work/neuro-intake'
for name in ('app.js','workflow.js'):
    p=app/name
    text=p.read_text('utf-8').replace('page();window.scrollTo(0,0);','page();scrollPageTop();').replace('page(); window.scrollTo(0,0);','page(); scrollPageTop();').replace('changed(); window.scrollTo(0,0);','changed(); scrollPageTop();')
    p.write_text(text,encoding='utf-8')
p=app/'index.html'
text=p.read_text('utf-8')
if 'desktop.css' not in text:
    text=text.replace('</head>','<link rel="stylesheet" href="desktop.css?v=20261114-desktop1"><script>if(new URLSearchParams(location.search).get("desktop")==="1")document.documentElement.classList.add("desktop-app");</script></head>')
text=re.sub(r'(<aside class="right"><section class="card">).*?(<p id="live")',r'\1<div class="spread"><h3>现病史实时预览</h3><button class="desktop-copy" data-copy="history">复制</button></div>\2',text,flags=re.S)
text=text.replace('20261114-simple1','20261114-desktop1')
p.write_text(text,encoding='utf-8')
for name in ('index.html','app.js','workflow.js','desktop.css'):
    source=app/name
    if source.exists(): (root/'outputs/查房联动演示/assistant'/name).write_bytes(source.read_bytes())
