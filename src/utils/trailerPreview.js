// Which clip a movie card previews on hover: its YouTube trailer, else a demo video, else none.
export function previewMediaFor(videoId, demoMedia) {
  if (videoId) return { kind: 'youtube', videoId };
  if (demoMedia?.kind === 'video' && demoMedia.src) return { kind: 'video', src: demoMedia.src };
  return null;
}

// A silent, looping, control-free embed for the small preview screen.
export const youtubePreviewUrl = (videoId) => `https://www.youtube-nocookie.com/embed/${videoId}?${new URLSearchParams({
  autoplay: '1', mute: '1', controls: '0', loop: '1', playlist: videoId, playsinline: '1',
  rel: '0', modestbranding: '1', disablekb: '1', iv_load_policy: '3', fs: '0',
})}`;

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
