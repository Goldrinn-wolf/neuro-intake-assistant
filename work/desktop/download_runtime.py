from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request, urllib.parse, json, re, time
folder=Path(__file__).resolve().parent/'compat'
def download(arch,ident):
    payload=urllib.parse.urlencode({'updateIDs':json.dumps([{'size':0,'languages':'','uidInfo':ident,'updateID':ident}])}).encode()
    page=urllib.request.urlopen(urllib.request.Request('https://www.catalog.update.microsoft.com/DownloadDialog.aspx',data=payload),timeout=40).read().decode()
    url=re.findall(r"https?://[^'\"\s]+\.exe",page)[0].replace('http:','https:')
    head=urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=30)
    size=int(head.headers['Content-Length']);chunk=2*1024*1024
    parts=list(range((size+chunk-1)//chunk))
    dest=folder/f'runtime109-{arch}-complete.exe'
    def fetch(i):
        start=i*chunk;end=min(size,start+chunk)-1
        path=folder/f'{arch}-{i}.part'
        if path.exists() and path.stat().st_size==end-start+1:return i
        for retry in range(4):
            try:
                request=urllib.request.Request(url,headers={'Range':f'bytes={start}-{end}'})
                with urllib.request.urlopen(request,timeout=60) as response:
                    if response.status!=206:raise RuntimeError('Range response required')
                    data=response.read()
                if len(data)!=end-start+1:raise RuntimeError('Partial download')
                path.write_bytes(data);return i
            except Exception:
                if retry==3:raise
                time.sleep(1)
    print(arch,'downloading',size,flush=True)
    with ThreadPoolExecutor(max_workers=20) as pool:
        for count,job in enumerate(as_completed([pool.submit(fetch,i) for i in parts]),1):
            job.result()
            if count%10==0:print(arch,count,'/',len(parts),flush=True)
    with dest.open('wb') as output:
        for i in parts:output.write((folder/f'{arch}-{i}.part').read_bytes())
    print(arch,'complete',dest.stat().st_size,flush=True)
for arch,ident in [('x86','cd7a382c-62c6-46c0-8098-0d50a7953b61'),('x64','322eb0af-cdbc-4a17-a8ca-f0ace4d4adc8')]:download(arch,ident)
