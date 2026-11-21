param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'A versão do package.json precisa seguir o formato x.y.z.' }
if (!$OutputDirectory) { $OutputDirectory = Join-Path $repo 'release' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stage = Join-Path $env:TEMP ('cobre-update-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$appFiles = @('account-preload.js','account.html','account-renderer.js','byte-range.js','desktop-discovery.js','desktop-pairing-qr.js','host-grant-access.js','cobre-id-client.js','cobre-id-main.js','features-main.js','features.js','icon.ico','icon.png','index.html','layout.js','main.js','mini-preload.js','mini-renderer.js','mini.html','package.json','preload.js','remote.html','renderer.js','theme.js','styles/tokens.css','styles/fonts.css','styles/app.css','fonts/bricolage-latin.woff2','fonts/bricolage-latin-ext.woff2','fonts/jetbrains-mono-latin.woff2','fonts/jetbrains-mono-latin-ext.woff2','update-main.js')
$paths = [System.Collections.Generic.List[string]]::new()
try {
  foreach ($name in $appFiles) {
    $from = Join-Path $repo $name
    if (!(Test-Path -LiteralPath $from -PathType Leaf)) { throw "Falta o arquivo do app: $name" }
    $destination = Join-Path $stage $name
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $from -Destination $destination -Force
    $paths.Add($name)
  }
  $appAsar = Join-Path $repo 'release/win-unpacked/resources/app.asar'
  if (!(Test-Path -LiteralPath $appAsar -PathType Leaf)) { throw 'Gere primeiro o instalador Windows para criar release/win-unpacked/resources/app.asar.' }
  Copy-Item -LiteralPath $appAsar -Destination (Join-Path $stage 'app.asar') -Force
  $paths.Add('app.asar')

  $runtime = Join-Path $stage '.runtime'
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $runtimePackage = [ordered]@{ name=$package.name; version=$version; private=$true; dependencies=$package.dependencies }
  $runtimePackage | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $runtime 'package.json') -Encoding UTF8
  Copy-Item -LiteralPath (Join-Path $repo 'package-lock.json') -Destination (Join-Path $runtime 'package-lock.json') -Force
  & npm ci --prefix $runtime --omit=dev --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'Não consegui preparar as dependências de produção do pacote.' }
  Move-Item -LiteralPath (Join-Path $runtime 'node_modules') -Destination (Join-Path $stage 'node_modules') -Force
  Remove-Item -LiteralPath $runtime -Recurse -Force
  Get-ChildItem -LiteralPath (Join-Path $stage 'node_modules') -File -Recurse | ForEach-Object {
    $paths.Add($_.FullName.Substring($stage.Length + 1).Replace('\','/'))
  }
  $manifest = [ordered]@{ version=$version; files=@($paths | Sort-Object -Unique) }
  [IO.File]::WriteAllText((Join-Path $stage 'cobre-update.json'), ($manifest | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
  $archive = Join-Path $OutputDirectory "Cobre-Update-v$version-x64.zip"
  if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal
  $item = Get-Item -LiteralPath $archive
  if ($item.Length -gt 80MB) { throw 'O pacote de atualização excede o limite de 80 MiB.' }
  $item | Select-Object FullName,Length
} finally {
  if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
