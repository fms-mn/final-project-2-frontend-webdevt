// Which clip a movie card previews on hover: its YouTube trailer, else a demo video, else none.
export function previewMediaFor(videoId, demoMedia) {
  if (videoId) return { kind: 'youtube', videoId };
  if (demoMedia?.kind === 'video' && demoMedia.src) return { kind: 'video', src: demoMedia.src, label: demoMedia.label || 'Sample footage · not a movie trailer' };
  return null;
}

export const PREVIEW_START_SECONDS = 4; // skip the studio logos at the very start
export const PREVIEW_LENGTH_SECONDS = 28; // loop a short window, never reaching the end screen

// Player settings for the silent, control-free preview. There is no `loop` or `playlist`
// setting on purpose: a playlist adds previous/next arrows and a "More videos" strip.
// The preview loops by seeking back itself (see previewLoopTarget).
export const previewPlayerVars = (videoId, origin) => ({
  autoplay: 1, mute: 1, controls: 0, playsinline: 1, start: PREVIEW_START_SECONDS,
  rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3, fs: 0, origin,
});

// Where to seek to keep the preview inside its short window, or null to keep playing.
export function previewLoopTarget(currentTime, duration, { start = PREVIEW_START_SECONDS, length = PREVIEW_LENGTH_SECONDS } = {}) {
  const end = Math.min(start + length, Math.max(duration - 1.5, start + 1));
  return currentTime >= end ? start : null;
}

// YouTube's own overlays (play/pause symbol, spinner, "video unavailable") show whenever the
// video is not actually playing, so the preview shows the video only in the playing state.
// States are YouTube's: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
export const previewVideoVisible = (state) => state === 1;
export const previewNeedsRestart = (state) => state === 0;

export const PREVIEW_WIDTH = 460;
export const PREVIEW_INFO_HEIGHT = 128; // room under the video for the title, details and synopsis

// Where the floating trailer panel goes, in screen coordinates. It sits beside the card: on the
// right if there is room, else on the left. On a narrow screen with no room on either side it
// covers the card instead ("over"). `rect` is the card's box, `size` the panel's (measured, or
// an estimate on first paint).
export function previewPlacement(rect, viewport, size = {}, { gap = 16, margin = 8 } = {}) {
  const width = Math.min(size.width ?? PREVIEW_WIDTH, viewport.width - margin * 2);
  const height = size.height ?? (width * 9) / 16 + PREVIEW_INFO_HEIGHT;
  const clampTop = (top) => Math.max(margin, Math.min(top, viewport.height - margin - height));
  const centred = clampTop(rect.top + rect.height / 2 - height / 2);

  if (rect.right + gap + width <= viewport.width - margin) return { side: 'right', left: rect.right + gap, top: centred, width };
  if (rect.left - gap - width >= margin) return { side: 'left', left: rect.left - gap - width, top: centred, width };
  const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, viewport.width - margin - width));
  return { side: 'over', left, top: clampTop(rect.top + rect.height / 2 - height / 2), width };
}

// A finger that travels more than this many pixels is scrolling, not holding.
export const PRESS_MOVE_TOLERANCE = 10;
export const pressMoved = (from, to, tolerance = PRESS_MOVE_TOLERANCE) => Math.hypot(to.x - from.x, to.y - from.y) > tolerance;

// Where the trailer panel goes while a finger holds a card (a "peek"): centred on the screen.
export function peekPlacement(viewport, size = {}, { margin = 16 } = {}) {
  const width = Math.min(size.width ?? PREVIEW_WIDTH, viewport.width - margin * 2);
  const height = size.height ?? (width * 9) / 16 + PREVIEW_INFO_HEIGHT;
  return {
    side: 'over',
    left: (viewport.width - width) / 2,
    top: Math.max(margin, (viewport.height - height) / 2),
    width,
  };
}
