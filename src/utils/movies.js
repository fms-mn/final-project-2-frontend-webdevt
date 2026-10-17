import { DEMO_TICKET_PRICE } from '../constants/pricing.js';
import { splitGenres } from './genres.js';

// The API stores movies as { title, synopsis, genre (delimited text), rating, posterUrl, duration,
// releaseDate, status: draft | published | archived } and only publishes the "published" ones.
// The pages were built around { description, genre: [..], status: now_showing | coming_soon,
// price }, so this adapter converts one shape into the other in a single place.

// The server says where a movie stands (`showStatus`): coming_soon before its release day,
// now_showing once released AND it has showings that can still be booked, and not_showing when
// it is released but has nothing to book. Without that answer (the offline demo catalogue) a
// movie simply counts as "now showing" once its release date has passed.
export const isReleased = (movie, now = new Date()) => new Date(movie.releaseDate) <= now;

const SHOW_STATUSES = ['now_showing', 'coming_soon', 'not_showing'];

export function normalizeMovie(movie, now = new Date()) {
  const fromServer = SHOW_STATUSES.includes(movie.showStatus);
  // The real price is the cheapest bookable showing; only the demo catalogue uses the flat price.
  const price = Number.isInteger(movie.fromPrice)
    ? movie.fromPrice / 100
    : (String(movie._id ?? '').startsWith('demo-') ? DEMO_TICKET_PRICE : (fromServer ? null : movie.price));
  return {
    ...movie,
    description: movie.synopsis,
    genre: splitGenres(movie.genre),
    status: fromServer ? movie.showStatus : (isReleased(movie, now) ? 'now_showing' : 'coming_soon'),
    price,
  };
}
