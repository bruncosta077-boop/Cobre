param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'A versão do package.json precisa seguir o formato x.y.z.' }
if (!$OutputDirectory) { $OutputDirectory = Join-Path $repo 'release' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

# Gera dois pacotes de atualização:
# - Cobre-Update-v<versão>-x64.zip: só app.asar e o manifesto. É o nome que todas as versões desde a 3.6 procuram, e
#   app.asar está na lista permitida de todas elas; instalações empacotadas (instalador e ZIP portátil) só trocam esse
#   arquivo. Manter este pacote enxuto evita que um arquivo novo do app quebre a atualização das versões anteriores.
# - Cobre-Update-Full-v<versão>-x64.zip: arquivos soltos do app e dependências de produção, para instalações
#   descompactadas (sem app.asar). Usado pelo atualizador a partir da 3.16.
$appFiles = @('account-preload.js','account.html','account-renderer.js','byte-range.js','desktop-discovery.js','desktop-pairing-qr.js','host-grant-access.js','cobre-id-client.js','cobre-id-main.js','features-main.js','features.js','icon.ico','icon.png','index.html','layout.js','main.js','mini-preload.js','mini-renderer.js','mini.html','package.json','playback-duration.js','preload.js','remote.html','renderer.js','theme.js','styles/tokens.css','styles/fonts.css','styles/app.css','fonts/bricolage-latin.woff2','fonts/bricolage-latin-ext.woff2','fonts/jetbrains-mono-latin.woff2','fonts/jetbrains-mono-latin-ext.woff2','update-main.js')
$appAsar = Join-Path $repo 'release/win-unpacked/resources/app.asar'
if (!(Test-Path -LiteralPath $appAsar -PathType Leaf)) { throw 'Gere primeiro o instalador Windows para criar release/win-unpacked/resources/app.asar.' }

function New-Stage { $dir = Join-Path $env:TEMP ('cobre-update-' + [guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Force -Path $dir | Out-Null; $dir }

# Caminhos relativos montados pelos nomes das pastas, nunca cortando FullName pelo tamanho da pasta de origem:
# no runner do GitHub o TEMP vem em formato curto (RUNNER~1) e o FullName em formato longo, o que deslocava o corte
# e publicava entradas como "12/node_modules/..." que o app recusa.
function Get-RelativeFiles([string]$Directory, [string]$Prefix) {
  foreach ($item in Get-ChildItem -LiteralPath $Directory) {
    $relative = if ($Prefix) { "$Prefix/$($item.Name)" } else { $item.Name }
    if ($item.PSIsContainer) { Get-RelativeFiles $item.FullName $relative } else { $relative }
  }
}

function Write-UpdatePackage([string]$Stage, [string]$ArchiveName) {
  $files = @(Get-RelativeFiles $Stage '' | Sort-Object -Unique)
  if (!$files.Count) { throw "O pacote $ArchiveName ficou vazio." }
  $manifest = [ordered]@{ version=$version; files=$files }
  [IO.File]::WriteAllText((Join-Path $Stage 'cobre-update.json'), ($manifest | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
  $archive = Join-Path $OutputDirectory $ArchiveName
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  # O ZIP é montado a partir da mesma lista do manifesto: entradas com "/" e sem entradas de pasta em qualquer edição
  # do PowerShell (o Compress-Archive do Windows PowerShell 5.1 grava "\" e pastas, que o extrator do app não aceita).
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($name in @($files) + 'cobre-update.json') {
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $Stage $name), $name, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $zip.Dispose() }
  $item = Get-Item -LiteralPath $archive
  if ($item.Length -gt 80MB) { throw "O pacote $ArchiveName excede o limite de 80 MiB." }
  $item | Select-Object Name, Length, @{ n='Arquivos'; e={ $files.Count } }
}

$asarStage = New-Stage
$fullStage = New-Stage
try {
  Copy-Item -LiteralPath $appAsar -Destination (Join-Path $asarStage 'app.asar') -Force
  Write-UpdatePackage $asarStage "Cobre-Update-v$version-x64.zip"

  foreach ($name in $appFiles) {
    $from = Join-Path $repo $name
    if (!(Test-Path -LiteralPath $from -PathType Leaf)) { throw "Falta o arquivo do app: $name" }
    $destination = Join-Path $fullStage $name
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $from -Destination $destination -Force
  }
  $runtime = Join-Path $env:TEMP ('cobre-update-runtime-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  try {
    $runtimePackage = [ordered]@{ name=$package.name; version=$version; private=$true; dependencies=$package.dependencies }
    $runtimePackage | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $runtime 'package.json') -Encoding UTF8
    Copy-Item -LiteralPath (Join-Path $repo 'package-lock.json') -Destination (Join-Path $runtime 'package-lock.json') -Force
    & npm ci --prefix $runtime --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Não consegui preparar as dependências de produção do pacote.' }
    Move-Item -LiteralPath (Join-Path $runtime 'node_modules') -Destination (Join-Path $fullStage 'node_modules') -Force
  } finally {
    if (Test-Path -LiteralPath $runtime) { Remove-Item -LiteralPath $runtime -Recurse -Force }
  }
  Write-UpdatePackage $fullStage "Cobre-Update-Full-v$version-x64.zip"
} finally {
  foreach ($dir in $asarStage, $fullStage) { if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force } }
}
