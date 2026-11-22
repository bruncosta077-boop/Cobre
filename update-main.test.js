'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractSafe, validRelative, parseLatestDesktopReleaseAtom, parseAssetSha256, assertUpdateTargetWritable, extractorAllowedPaths } = require('./update-main');

test('fallback release feed selects the latest Desktop tag and converts notes to plain text', () => {
  const feed = `<?xml version="1.0"?><feed>
    <entry><updated>2026-11-22T10:00:00Z</updated><link rel="alternate" href="https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.14.0"/><title>Cobre Desktop 3.14</title><content type="html">&lt;h2&gt;Ajustes &amp;amp; melhorias&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;Correção do áudio&lt;/li&gt;&lt;/ul&gt;</content></entry>
    <entry><link rel="alternate" href="https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.13.0"/></entry>
  </feed>`;
  assert.deepEqual(parseLatestDesktopReleaseAtom(feed), {
    tag: 'cobre-desktop-v3.14.0', version: '3.14.0',
    notes: 'Ajustes & melhorias Correção do áudio', publishedAt: '2026-11-22T10:00:00Z',
  });
  assert.equal(parseLatestDesktopReleaseAtom('<feed></feed>'), null);
});

test('fallback checksum accepts only a full SHA-256 line for the requested package', () => {
  const hash = 'a'.repeat(64);
  assert.equal(parseAssetSha256(`${hash}  Cobre-Update-v3.14.0-x64.zip\n`, 'Cobre-Update-v3.14.0-x64.zip'), `sha256:${hash}`);
  assert.equal(parseAssetSha256(`${hash}  Cobre-Update-v3.13.0-x64.zip`, 'Cobre-Update-v3.14.0-x64.zip'), '');
});

test('updater checks that its destination can be written without leaving a probe file', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-write-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.doesNotThrow(() => assertUpdateTargetWritable(root));
  assert.deepEqual(fs.readdirSync(root), []);
});

test('update manifest allows only the packaged styles and font assets', () => {
  for (const file of [
    'fonts/bricolage-latin.woff2',
    'fonts/bricolage-latin-ext.woff2',
    'fonts/jetbrains-mono-latin.woff2',
    'fonts/jetbrains-mono-latin-ext.woff2',
    'styles/tokens.css',
    'styles/fonts.css',
    'styles/app.css',
    'desktop-discovery.js',
    'layout.js',
    'playback-duration.js',
    'node_modules/qrcode/lib/index.js',
  ]) assert.equal(validRelative(file), true, file);
  for (const file of ['fonts/unlisted.woff2', 'styles/extra.css', '../fonts/a.woff2', 'styles/../main.js']) {
    assert.equal(validRelative(file), false, file);
  }
});

test('JavaScript manifest validation and PowerShell extraction use the same allowlist', () => {
  const jsList = [
    'account-preload.js','account.html','account-renderer.js','app.asar','byte-range.js','desktop-discovery.js',
    'desktop-pairing-qr.js','host-grant-access.js','mini-renderer.js','cobre-id-client.js','cobre-id-main.js',
    'features-main.js','features.js','icon.ico','icon.png','index.html','layout.js','main.js','mini-preload.js',
    'mini.html','package.json','playback-duration.js','preload.js','remote.html','renderer.js','theme.js',
    'styles/tokens.css','styles/fonts.css','styles/app.css','fonts/bricolage-latin.woff2','fonts/bricolage-latin-ext.woff2',
    'fonts/jetbrains-mono-latin.woff2','fonts/jetbrains-mono-latin-ext.woff2','update-main.js','cobre-update.json',
  ].sort();
  assert.deepEqual(extractorAllowedPaths().sort(), jsList);
});

test('safe updater extracts the exact font and style paths from its ZIP', { skip: process.platform !== 'win32' }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-extract-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const stage = path.join(root, 'stage');
  const zip = path.join(root, 'package.zip');
  for (const relative of ['layout.js', 'playback-duration.js', 'fonts/bricolage-latin-ext.woff2', 'styles/fonts.css', 'cobre-update.json', 'node_modules/qrcode/index.js']) {
    const file = path.join(source, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'fixture');
  }
  const psQuote = (value) => "'" + value.replaceAll("'", "''") + "'";
  const script = path.join(root, 'make-zip.ps1');
  const command = 'Compress-Archive -Path ' + psQuote(path.join(source, '*')) + ' -DestinationPath ' + psQuote(zip) + ' -Force\n';
  fs.writeFileSync(script, command);
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true });

  await extractSafe(zip, stage);
  for (const relative of ['layout.js', 'playback-duration.js', 'fonts/bricolage-latin-ext.woff2', 'styles/fonts.css', 'cobre-update.json', 'node_modules/qrcode/index.js']) {
    assert.equal(fs.readFileSync(path.join(stage, relative), 'utf8'), 'fixture', relative);
  }
});

const builtUpdatePackage = path.join(__dirname, 'release', `Cobre-Update-v${require('./package.json').version}-x64.zip`);
test('the generated release update package passes the real safe extractor', { skip: !fs.existsSync(builtUpdatePackage) || process.platform !== 'win32' }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const stage = path.join(root, 'stage');
  await extractSafe(builtUpdatePackage, stage);
  const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'cobre-update.json'), 'utf8'));
  assert.equal(manifest.version, require('./package.json').version);
  for (const file of ['app.asar', 'layout.js', 'playback-duration.js']) {
    assert.ok(manifest.files.includes(file), `manifest contains ${file}`);
    assert.ok(fs.existsSync(path.join(stage, file)), `extracted ${file}`);
  }
});
