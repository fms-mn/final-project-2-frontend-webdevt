// Which clip a movie card previews on hover: its YouTube trailer, else a demo video, else none.
export function previewMediaFor(videoId, demoMedia) {
  if (videoId) return { kind: 'youtube', videoId };
  if (demoMedia?.kind === 'video' && demoMedia.src) return { kind: 'video', src: demoMedia.src, label: demoMedia.label || 'Sample footage · not a movie trailer' };
  return null;
}

// A silent, looping, control-free embed for the small preview screen.
export const youtubePreviewUrl = (videoId) => `https://www.youtube-nocookie.com/embed/${videoId}?${new URLSearchParams({
  autoplay: '1', mute: '1', controls: '0', loop: '1', playlist: videoId, playsinline: '1',
  rel: '0', modestbranding: '1', disablekb: '1', iv_load_policy: '3', fs: '0',
})}`;
