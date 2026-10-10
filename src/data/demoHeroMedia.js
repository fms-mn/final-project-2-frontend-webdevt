// Sample sources are available only to the explicit frontend demo catalog.
const previewClips = {
  'demo-midnight-signal': {
    src: '/demo-videos/flower.mp4',
    credit: { name: 'Flower video · MDN', source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', licenseName: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  },
  'demo-city-after-dark': {
    src: '/demo-videos/bunny-trailer.mp4',
    credit: { name: 'Big Buck Bunny · Blender Foundation', source: 'https://media.w3.org/2010/05/bunny/trailer.mp4', licenseName: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' },
  },
  'demo-blue-hour': {
    src: '/demo-videos/sintel-trailer.mp4',
    credit: { name: 'Sintel · Blender Foundation', source: 'https://media.w3.org/2010/05/sintel/trailer.mp4', licenseName: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' },
  },
};

export function demoHeroMediaFor(movieId) {
  const clip = previewClips[movieId];
  return clip ? { kind: 'video', ...clip, label: 'Demo preview video — not this movie’s trailer' } : null;
}
