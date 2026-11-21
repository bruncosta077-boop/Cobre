'use strict';
// Portable Cobre updater. Only accepts patch ZIPs from the fixed public GitHub repository.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const OWNER = 'bruncosta077-boop', REPO = 'Cobre';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const ASSET = (v) => `Cobre-Update-v${v}-x64.zip`;
const MAX_BYTES = 80 * 1024 * 1024;
const ALLOWED = new Set(['account-preload.js','account.html','account-renderer.js','app.asar','byte-range.js','desktop-pairing-qr.js','host-grant-access.js','mini-renderer.js','cobre-id-client.js','cobre-id-main.js','features-main.js','features.js','icon.ico','icon.png','index.html','layout.js','main.js','mini-preload.js','mini.html','package.json','preload.js','remote.html','renderer.js','theme.js','styles/tokens.css','styles/fonts.css','styles/app.css','fonts/bricolage-latin.woff2','fonts/bricolage-latin-ext.woff2','fonts/jetbrains-mono-latin.woff2','fonts/jetbrains-mono-latin-ext.woff2','update-main.js']);
const semver = (v) => { const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '')); return m ? m.slice(1).map(Number) : null; };
const newer = (a, b) => { for (let i=0;i<3;i++) { if (a[i] !== b[i]) return a[i] > b[i]; } return false; };
const safeNotes = (s) => String(s || '').slice(0, 24000);

module.exports = function initUpdater({ app, ipcMain, getWin }) {
  let ready = null, busy = false;
  const resourcesAsar = path.join(process.resourcesPath || '', 'app.asar');
  const packagedAsar = !!app.isPackaged && fs.existsSync(resourcesAsar);
  const supportsPatch = packagedAsar || !__dirname.toLowerCase().endsWith('.asar');
  const updatesDir = () => path.join(app.getPath('userData'), 'updates');
  const stateFile = () => path.join(app.getPath('userData'), 'update-installed.json');
  const send = (channel, data) => { const w=getWin(); if(w && !w.isDestroyed()) w.webContents.send(channel,data); };

  async function releaseInfo() {
    const r = await fetch(API, { headers: { 'User-Agent': 'Cobre-Desktop-Updater', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(r.status === 404 ? 'Ainda não há uma versão pública do Cobre.' : `GitHub respondeu com erro ${r.status}.`);
    const j = await r.json(), tag = /^cobre-desktop-v(\d+\.\d+\.\d+)$/.exec(j.tag_name || ''), version = tag && tag[1];
    if (!version || !semver(version)) throw new Error('A versão publicada no GitHub tem um formato inválido.');
    const current = app.getVersion(), available = newer(semver(version), semver(current) || [0,0,0]);
    const asset = (j.assets || []).find((a) => a.name === ASSET(version));
    return { current, version, updateAvailable: available, packageAvailable: supportsPatch && !!asset && asset.size <= MAX_BYTES, supported: supportsPatch, packageName: asset ? asset.name : '', size: asset ? asset.size : 0, notes: safeNotes(j.body), publishedAt: j.published_at || '', asset: asset && { url: asset.browser_download_url, size: asset.size, digest: asset.digest || '' } };
  }

  ipcMain.handle('cobreUpdateCheck', async () => {
    try { const info=await releaseInfo(); if(ready) return {ok:true,data:{...info,readyToInstall:true,version:ready.version,notes:ready.notes}}; return { ok: true, data: info }; }
    catch (e) { return { ok: false, error: e.message || 'Não consegui consultar atualizações.' }; }
  });

  ipcMain.handle('cobreUpdateDownload', async (_e, requestedVersion) => {
    if (busy) return { ok: false, error: 'Já existe uma atualização em andamento.' };
    busy = true;
    try {
      const info = await releaseInfo();
      if (!supportsPatch) throw new Error('Não reconheci o formato desta instalação do Cobre.');
      if (!info.updateAvailable || info.version !== requestedVersion) throw new Error('A versão disponível mudou. Verifique as atualizações novamente.');
      if (!info.packageAvailable) throw new Error('A release ainda não tem o pacote portátil de atualização.');
      if (!info.asset.url.startsWith(`https://github.com/${OWNER}/${REPO}/releases/download/`)) throw new Error('O endereço do pacote não é confiável.');
      const digest = /^sha256:([0-9a-f]{64})$/i.exec(info.asset.digest);
      if (!digest) throw new Error('A publicação não tem uma soma SHA-256 válida; a atualização foi cancelada.');
      const dir = updatesDir(); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const zipPath = path.join(dir, 'cobre-update.zip'), stage = path.join(dir, 'stage');
      const r = await fetch(info.asset.url, { headers: { 'User-Agent': 'Cobre-Desktop-Updater' }, signal: AbortSignal.timeout(300000), redirect: 'follow' });
      if (!r.ok || !r.body) throw new Error(`O download falhou (HTTP ${r.status}).`);
      const finalHost = new URL(r.url).hostname;
      if (!['github.com','release-assets.githubusercontent.com'].includes(finalHost)) throw new Error('O download foi redirecionado para um endereço inesperado.');
      const declared = Number(r.headers.get('content-length') || info.asset.size);
      if (declared !== info.asset.size || declared > MAX_BYTES) throw new Error('O tamanho do pacote não corresponde ao publicado.');
      const chunks = []; let total=0; const hash=crypto.createHash('sha256');
      for await (const chunk of r.body) { total+=chunk.length; if(total>MAX_BYTES) throw new Error('O pacote ultrapassa o limite permitido.'); chunks.push(Buffer.from(chunk)); hash.update(chunk); send('cobreUpdateProgress',{percent:Math.min(99,Math.round(total/info.asset.size*100)),received:total,total:info.asset.size}); }
      const buffer=Buffer.concat(chunks);
      if(total!==info.asset.size || hash.digest('hex').toLowerCase()!==digest[1].toLowerCase()) throw new Error('A verificação de integridade falhou. Nenhum arquivo foi instalado.');
      fs.writeFileSync(zipPath, buffer, { flag: 'wx' });
      await extractSafe(zipPath, stage);
      const manifestPath=path.join(stage,'cobre-update.json');
      if(!fs.existsSync(manifestPath)) throw new Error('O pacote não contém o manifesto de atualização.');
      const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      if(manifest.version!==info.version || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length>5000) throw new Error('O manifesto do pacote não corresponde à versão publicada.');
      const names=new Set();
      for(const name of manifest.files){ if(typeof name!=='string' || !validRelative(name) || names.has(name) || !fs.existsSync(path.join(stage,name))) throw new Error('O pacote lista arquivos inválidos.'); names.add(name); }
      const staged=walkFiles(stage).filter((x)=>x!=='cobre-update.json');
      if(staged.length!==names.size || staged.some((x)=>!names.has(x))) throw new Error('Os arquivos do pacote não correspondem ao manifesto.');
      let installFiles, target;
      if (packagedAsar) {
        if (!names.has('app.asar')) throw new Error('O pacote da atualização não contém o aplicativo empacotado esperado.');
        installFiles = ['app.asar']; target = process.resourcesPath;
      } else {
        if (!names.has('package.json') || !names.has('renderer.js') || !names.has('main.js')) throw new Error('O pacote não contém os arquivos essenciais do Cobre.');
        installFiles = [...names].filter((name) => name !== 'app.asar'); target = __dirname;
      }
      ready={version:info.version,notes:info.notes,stage,files:installFiles,zipPath,target};
      send('cobreUpdateProgress',{percent:100,received:total,total:info.asset.size});
      return { ok:true, data:{version:ready.version,notes:ready.notes} };
    } catch(e) { ready=null; return {ok:false,error:e.message||'O download da atualização falhou.'}; }
    finally { busy=false; }
  });

  ipcMain.handle('cobreUpdateInstall', async () => {
    if(!ready) return {ok:false,error:'Baixe e verifique a atualização antes de instalar.'};
    try {
      const target=ready.target, exe=process.execPath, dir=updatesDir();
      const payload={version:ready.version,notes:ready.notes,target,stage:ready.stage,files:ready.files,state:stateFile(),exe,pid:process.pid};
      const argsPath=path.join(dir,'install.json'), scriptPath=path.join(dir,'install.ps1');
      fs.writeFileSync(argsPath,JSON.stringify(payload),{mode:0o600}); fs.writeFileSync(scriptPath,INSTALL_SCRIPT,'utf8');
      const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',scriptPath,argsPath],{detached:true,stdio:'ignore',windowsHide:true});
      child.unref(); ready=null;
      setTimeout(()=>app.quit(),500);
      return {ok:true};
    } catch(e) { return {ok:false,error:e.message||'Não consegui iniciar a instalação.'}; }
  });

  ipcMain.handle('cobreUpdateTakeNotice', async () => {
    for(const [suffix,kind] of [['update-installed.json','installed'],['update-failed.json','failed']]){
      const f=path.join(app.getPath('userData'),suffix);
      try { const d=JSON.parse(fs.readFileSync(f,'utf8')); fs.unlinkSync(f); if(kind==='installed' && d.version!==app.getVersion()) continue; return {kind,...d}; } catch {}
    }
    return null;
  });
};

function validRelative(name) {
  if(typeof name!=='string' || name.length>240 || name.startsWith('/') || name.includes('\\') || name.includes(':')) return false;
  const p=name.split('/'); if(p.some((s)=>!s || s==='.' || s==='..')) return false;
  return name==='cobre-update.json' || ALLOWED.has(name) || (p[0]==='node_modules' && p.length<=8 && p.every((s)=>/^[a-zA-Z0-9_.@+-]+$/.test(s)));
}
function walkFiles(dir, rel='') { return fs.readdirSync(dir,{withFileTypes:true}).flatMap((e)=>{const p=rel?rel+'/'+e.name:e.name; return e.isDirectory()?walkFiles(path.join(dir,e.name),p):[p];}); }

async function extractSafe(zipPath, outDir) {
  const ps=path.join(path.dirname(zipPath),'extract.ps1');
  fs.writeFileSync(ps,EXTRACT_SCRIPT,'utf8');
  const { execFile }=require('child_process');
  await new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,zipPath,outDir],{windowsHide:true,timeout:60000,maxBuffer:1024*1024},(e,_o,err)=>e?reject(new Error((err||'').trim()||'Não consegui abrir o pacote de atualização.')):resolve()));
}

const EXTRACT_SCRIPT = String.raw`
param([string]$ZipPath,[string]$OutDir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$allowed=@('account-preload.js','account.html','account-renderer.js','app.asar','byte-range.js','desktop-pairing-qr.js','host-grant-access.js','mini-renderer.js','cobre-id-client.js','cobre-id-main.js','features-main.js','features.js','icon.ico','icon.png','index.html','main.js','mini-preload.js','mini.html','package.json','preload.js','remote.html','renderer.js','update-main.js','cobre-update.json')
if(Test-Path -LiteralPath $OutDir){Remove-Item -LiteralPath $OutDir -Recurse -Force}; New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$z=[IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  if($z.Entries.Count -lt 2 -or $z.Entries.Count -gt 5000){throw 'Quantidade de arquivos inválida.'}
  $seen=@{}
  foreach($e in $z.Entries){
    $n=$e.FullName.Replace('\','/'); if($n.EndsWith('/')){$n=$n.TrimEnd('/')}
    if(!$n){continue}; $parts=$n.Split('/'); $isDir=$e.FullName.EndsWith('/'); if($parts.Count -gt 8 -or $parts -contains '.' -or $parts -contains '..' -or $n.Contains(':')){throw 'Caminho inválido no pacote.'}
    if($parts.Count -eq 1){if($isDir){if($n -ne 'node_modules'){throw ('Pasta não permitida: '+$n)}}elseif($n -notin $allowed){throw ('Arquivo não permitido: '+$n)}} elseif($parts[0] -ne 'node_modules' -or $parts.Count -gt 8){throw ('Pasta não permitida: '+$n)}
    if($isDir){continue}; if($seen.ContainsKey($n)){throw 'Arquivo duplicado.'}; $seen[$n]=$true
    $dest=Join-Path $OutDir ($n.Replace('/',[IO.Path]::DirectorySeparatorChar)); $full=[IO.Path]::GetFullPath($dest); $root=[IO.Path]::GetFullPath($OutDir)+[IO.Path]::DirectorySeparatorChar
    if(!$full.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)){throw 'Caminho fora da pasta de atualização.'}
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($full)) | Out-Null
    [IO.Compression.ZipFileExtensions]::ExtractToFile($e,$full,$true)
  }
} finally {$z.Dispose()}
`;

const INSTALL_SCRIPT = String.raw`
param([string]$ArgsPath)
$ErrorActionPreference='Stop'
$a=Get-Content -LiteralPath $ArgsPath -Raw | ConvertFrom-Json
$failure=Join-Path (Split-Path -Parent $a.state) 'update-failed.json'
try {
  try { Wait-Process -Id ([int]$a.pid) -Timeout 90 -ErrorAction SilentlyContinue } catch {}
  $backup=Join-Path (Split-Path -Parent $a.state) ('update-backup-'+$a.version)
  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  $done=[System.Collections.Generic.List[object]]::new()
  try {
    foreach($name in $a.files){
      $parts=$name.Split('/'); if($parts.Count -gt 8 -or $parts -contains '..' -or $parts -contains '.' -or $name.Contains(':')){throw 'Manifesto com caminho inválido.'}
      $src=[IO.Path]::GetFullPath((Join-Path $a.stage ($name.Replace('/',[IO.Path]::DirectorySeparatorChar))))
      $dst=[IO.Path]::GetFullPath((Join-Path $a.target ($name.Replace('/',[IO.Path]::DirectorySeparatorChar))))
      if(!$src.StartsWith([IO.Path]::GetFullPath($a.stage)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or !$dst.StartsWith([IO.Path]::GetFullPath($a.target)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Caminho fora da pasta do app.'}
      $bk=Join-Path $backup ($name.Replace('/',[IO.Path]::DirectorySeparatorChar)); New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($bk)) | Out-Null
      if(Test-Path -LiteralPath $dst){Copy-Item -LiteralPath $dst -Destination $bk -Force; $existed=$true}else{$existed=$false}
      $done.Add(@{dst=$dst;bk=$bk;existed=$existed}) | Out-Null
      New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($dst)) | Out-Null
      Copy-Item -LiteralPath $src -Destination $dst -Force
    }
    $notes=[string]$a.notes
    $stateJson=@{version=$a.version;notes=$notes;installedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()} | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText($a.state,$stateJson,[System.Text.UTF8Encoding]::new($false))
    if(Test-Path -LiteralPath $failure){Remove-Item -LiteralPath $failure -Force}
  } catch {
    for($i=$done.Count-1;$i -ge 0;$i--){$x=$done[$i];if($x.existed -and (Test-Path -LiteralPath $x.bk)){Copy-Item -LiteralPath $x.bk -Destination $x.dst -Force}elseif(Test-Path -LiteralPath $x.dst){Remove-Item -LiteralPath $x.dst -Force}}
    throw
  }
  Start-Process -FilePath $a.exe
} catch {
  $failureJson=@{error=$_.Exception.Message;version=$a.version} | ConvertTo-Json
  [IO.File]::WriteAllText($failure,$failureJson,[System.Text.UTF8Encoding]::new($false))
  Start-Process -FilePath $a.exe
}
`;
