// Preview clips are separate from movie records so live API trailers can replace them.
const previewClips = {
  'demo-midnight-signal': { src: '/demo-videos/flower.mp4' },
  'demo-city-after-dark': {
    src: '/demo-videos/bunny-trailer.mp4',
    credit: { name: 'Big Buck Bunny · Blender Foundation', source: 'https://media.w3.org/2010/05/bunny/trailer.mp4' },
  },
  'demo-blue-hour': {
    src: '/demo-videos/sintel-trailer.mp4',
    credit: { name: 'Sintel · Blender Foundation', source: 'https://media.w3.org/2010/05/sintel/trailer.mp4' },
  },
};

export function demoHeroMediaFor(movieId) {
  const clip = previewClips[movieId];
  return clip ? { kind: 'video', ...clip, label: 'Demo preview video', loop: true } : null;
}
