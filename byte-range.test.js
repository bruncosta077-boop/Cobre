'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const parseByteRange = require('./byte-range');

test('full response when no range is requested, including empty files', () => {
  assert.deepEqual(parseByteRange(undefined, 10), { start: 0, end: 9, length: 10, partial: false });
  assert.deepEqual(parseByteRange(undefined, 0), { start: 0, end: -1, length: 0, partial: false });
});

test('parses bounded, open-ended and suffix byte ranges', () => {
  assert.deepEqual(parseByteRange('bytes=2-5', 10), { start: 2, end: 5, length: 4, partial: true });
  assert.deepEqual(parseByteRange('bytes=7-', 10), { start: 7, end: 9, length: 3, partial: true });
  assert.deepEqual(parseByteRange('bytes=-4', 10), { start: 6, end: 9, length: 4, partial: true });
  assert.deepEqual(parseByteRange('bytes=0-99', 10), { start: 0, end: 9, length: 10, partial: true });
});

test('rejects malformed, multiple and unsatisfiable byte ranges', () => {
  for (const header of ['bytes=-0', 'bytes=10-', 'bytes=7-2', 'bytes=0-1,4-5', 'items=0-1', 'bytes=-']) {
    assert.equal(parseByteRange(header, 10), null, header);
  }
  assert.equal(parseByteRange('bytes=0-0', 0), null);
  assert.equal(parseByteRange('bytes=0-1', Number.MAX_SAFE_INTEGER + 1), null);
});
