"""Download the pinned official desktop dependencies; --full includes legacy runtimes."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,sys,urllib.request,zipfile

here=Path(__file__).resolve().parent
cache=here/'compat';cache.mkdir(exist_ok=True)
spec=json.loads((here/'dependencies.json').read_text('utf8'))
parser=argparse.ArgumentParser();parser.add_argument('--full',action='store_true');args=parser.parse_args()
def sha(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def fetch(name,url,expected=None):
    path=cache/name
    if not path.exists() or (expected and sha(path)!=expected):
        print('Downloading',name,flush=True);urllib.request.urlretrieve(url,path)
    if expected and sha(path)!=expected:raise RuntimeError('SHA256 mismatch: '+name)
    return path
def microsoft_signature(path):
    env=dict(os.environ,CLINICAL_VERIFY_FILE=str(path))
    env.pop('PSModulePath',None)
    command="$s=Get-AuthenticodeSignature -LiteralPath $env:CLINICAL_VERIFY_FILE; if($s.Status -ne 'Valid' -or $s.SignerCertificate.Subject -notlike '*CN=Microsoft Corporation*'){exit 1}"
    shell=shutil.which('pwsh.exe') or shutil.which('powershell.exe')
    subprocess.run([shell,'-NoProfile','-NonInteractive','-Command',command],env=env,check=True)

sdk=fetch('sdk.zip',spec['sdk']['url'],spec['sdk']['sha256'])
with zipfile.ZipFile(sdk) as archive:
    for item in archive.infolist():
        path=cache/'sdk'/item.filename
        if not path.resolve().is_relative_to((cache/'sdk').resolve()):raise RuntimeError('Unsafe SDK archive path')
    archive.extractall(cache/'sdk')
print('WebView2 SDK ready:',spec['sdk']['version'],flush=True)
if args.full:
    if os.name!='nt':raise RuntimeError('Full packaging requires Windows for Microsoft signature checks')
    net=fetch('dotnet462.exe',spec['dotnet']['url'],spec['dotnet']['sha256']);microsoft_signature(net)
    tool=fetch('7zr.exe','https://www.7-zip.org/a/7zr.exe',spec['extractor_sha256'])
    subprocess.run([sys.executable,str(here/'download_runtime.py')],check=True)
    for arch in ('x86','x64'):
        installer=cache/('runtime109-'+arch+'-complete.exe')
        if sha(installer)!=spec['runtime-'+arch]['sha256']:raise RuntimeError('Runtime package SHA256 mismatch: '+arch)
        microsoft_signature(installer)
        unpack=cache/('unpack-'+arch);payload=cache/('payload-'+arch)
        subprocess.run([str(tool),'x',str(installer),'-o'+str(unpack),'-y'],check=True)
        subprocess.run([str(tool),'x',str(unpack/'MSEDGE.7z'),'-o'+str(payload),'-y'],check=True)
        microsoft_signature(payload/'Chrome-bin/109.0.1518.140/msedgewebview2.exe')
    print('Full desktop dependencies downloaded and verified.',flush=True)
