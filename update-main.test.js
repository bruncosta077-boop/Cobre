'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractSafe, validRelative } = require('./update-main');

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
    'node_modules/qrcode/lib/index.js',
  ]) assert.equal(validRelative(file), true, file);
  for (const file of ['fonts/unlisted.woff2', 'styles/extra.css', '../fonts/a.woff2', 'styles/../main.js']) {
    assert.equal(validRelative(file), false, file);
  }
});

test('safe updater extracts the exact font and style paths from its ZIP', { skip: process.platform !== 'win32' }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cobre-update-extract-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const stage = path.join(root, 'stage');
  const zip = path.join(root, 'package.zip');
  for (const relative of ['fonts/bricolage-latin-ext.woff2', 'styles/fonts.css', 'cobre-update.json', 'node_modules/qrcode/index.js']) {
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
  for (const relative of ['fonts/bricolage-latin-ext.woff2', 'styles/fonts.css', 'cobre-update.json', 'node_modules/qrcode/index.js']) {
    assert.equal(fs.readFileSync(path.join(stage, relative), 'utf8'), 'fixture', relative);
  }
});
