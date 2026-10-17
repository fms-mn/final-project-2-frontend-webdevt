import { manilaDay, shiftDay, shortDate, today } from './manila.js';

// Which movie the landing page's ticket shows. Only a movie with a real upcoming showing counts
// (the server sends `nextShowing` for showings customers can still book), so the ticket never
// advertises something nobody can book. A movie that is already showing comes before one that is
// still coming soon; then the one whose next showing is soonest; then by title, so the choice is
// the same for everyone.
export function pickFeatured(movies, now = Date.now()) {
  const candidates = movies.filter((movie) => movie.nextShowing
    && (movie.upcomingShowings ?? 0) > 0
    && ['now_showing', 'coming_soon'].includes(movie.status)
    && new Date(movie.nextShowing).getTime() > now);
  if (candidates.length === 0) return null;
  const rank = (movie) => (movie.status === 'now_showing' ? 0 : 1);
  return candidates.sort((a, b) => rank(a) - rank(b)
    || new Date(a.nextShowing) - new Date(b.nextShowing)
    || a.title.localeCompare(b.title))[0];
}

// "Today", "Tomorrow", or "Thu, Oct 15": how a showing's day reads on the ticket.
export function dayWord(value, now = new Date()) {
  const day = manilaDay(value);
  const current = manilaDay(now);
  if (day === current) return 'Today';
  if (day === shiftDay(current, 1)) return 'Tomorrow';
  return shortDate(value);
}

export { today };
