export function trailerVideoId(movie) {
  const direct = movie?.trailerId;
  if (typeof direct === 'string' && /^[\w-]{11}$/.test(direct)) return direct;
  if (!movie?.trailerUrl) return '';
  try {
    const url = new URL(movie.trailerUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || '';
    }
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}
