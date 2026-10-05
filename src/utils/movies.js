import { DEMO_TICKET_PRICE } from '../constants/pricing.js';

// The API stores movies as { title, synopsis, genre (one text), rating, posterUrl, duration,
// releaseDate, status: draft | published | archived } and only publishes the "published" ones.
// The pages were built around { description, genre: [..], status: now_showing | coming_soon,
// price }, so this adapter converts one shape into the other in a single place.

// Until showtimes are served by the backend, "now showing" simply means "already released".
export const isReleased = (movie, now = new Date()) => new Date(movie.releaseDate) <= now;

export function normalizeMovie(movie, now = new Date()) {
  return {
    ...movie,
    description: movie.synopsis,
    genre: movie.genre ? [movie.genre] : [],
    status: isReleased(movie, now) ? 'now_showing' : 'coming_soon',
    price: DEMO_TICKET_PRICE,
  };
}
