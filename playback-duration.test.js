'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { effectiveDuration } = require('./playback-duration');

test('prefers a finite positive duration from the media element', () => {
  assert.equal(effectiveDuration(244.5, 245), 244.5);
});

test('falls back to scanned metadata when the media element has no usable duration', () => {
  for (const native of [0, NaN, Infinity, -Infinity]) assert.equal(effectiveDuration(native, 245), 245);
});

test('returns zero when neither duration source is valid', () => {
  assert.equal(effectiveDuration(0, 0), 0);
  assert.equal(effectiveDuration(NaN, Infinity), 0);
});
