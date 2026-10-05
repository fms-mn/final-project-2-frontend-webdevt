import initialMovies from './movies.json';

// Frontend-only catalog. Browser storage can be edited by anyone.
const MOVIES_KEY = 'filme_demo_movies';
export function listMovies({ status, search } = {}) {
  let movies = initialMovies;
  try { const saved = JSON.parse(localStorage.getItem(MOVIES_KEY)); if (Array.isArray(saved)) movies = saved; }
  catch { /* Use bundled sample catalog. */ }
  const query = search?.trim().toLowerCase();
  return movies.filter((movie) => (!status || movie.status === status) && (!query || movie.title.toLowerCase().includes(query)));
}
export function getMovieById(id) { return listMovies().find((movie) => movie._id === id) || null; }
export function saveDemoMovie(movie) {
  const title = movie.title?.trim();
  const price = Number(movie.price);
  if (!title || !Number.isFinite(price) || price <= 0) throw new Error('Enter a title and positive ticket price');
  const movies = listMovies();
  const entry = { ...movie, title, price, _id: movie._id || crypto.randomUUID() };
  const index = movies.findIndex((item) => item._id === entry._id);
  if (index < 0) movies.push(entry); else movies[index] = entry;
  localStorage.setItem(MOVIES_KEY, JSON.stringify(movies));
  return entry;
}
export function deleteDemoMovie(id) { localStorage.setItem(MOVIES_KEY, JSON.stringify(listMovies().filter((movie) => movie._id !== id))); }
