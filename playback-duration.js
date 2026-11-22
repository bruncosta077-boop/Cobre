'use strict';

function effectiveDuration(nativeDuration, metadataDuration) {
  const native = Number(nativeDuration);
  if (Number.isFinite(native) && native > 0) return native;
  const metadata = Number(metadataDuration);
  return Number.isFinite(metadata) && metadata > 0 ? metadata : 0;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { effectiveDuration };
if (typeof window !== 'undefined') window.CobrePlaybackDuration = { effectiveDuration };
