'use strict';

/** Parse a single RFC 7233 byte range. Returns null for an invalid/unsatisfiable range. */
function parseByteRange(header, size) {
  if (!Number.isSafeInteger(size) || size < 0) return null;
  if (header == null || header === '') {
    return { start: 0, end: size - 1, length: size, partial: false };
  }
  if (size === 0 || typeof header !== 'string' || header.includes(',')) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;

  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return null;
    end = Math.min(end, size - 1);
  }

  return { start, end, length: end - start + 1, partial: true };
}

module.exports = parseByteRange;
