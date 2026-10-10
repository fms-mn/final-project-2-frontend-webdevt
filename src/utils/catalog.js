import { demoMovies, getDemoMovie } from '../data/demoMovies.js';
import { normalizeMovie } from './movies.js';
export async function loadMovieCatalog(request, explicitDemo, signal) {
  const rows = explicitDemo ? demoMovies : await request('/movies', { signal });
  if (!Array.isArray(rows)) throw new Error('Invalid movie service response');
  return rows.map(movie => normalizeMovie(movie));
}
export async function loadMovieRecord(request, id, explicitDemo, signal) {
  if (explicitDemo) { const movie = getDemoMovie(id); return movie ? normalizeMovie(movie) : null; }
  return normalizeMovie(await request('/movies/' + encodeURIComponent(id), { signal }));
}
