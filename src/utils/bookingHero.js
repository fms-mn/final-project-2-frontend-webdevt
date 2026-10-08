import { manilaDay, shiftDay } from './manila.js';

const idOf = (value) => String(value?._id ?? value ?? '');

export function publishedShowings(showings) {
  return showings.filter((showing) => showing.status !== 'cancelled' && showing.published !== false && showing.isPublished !== false);
}

export function heroDates(showings, currentDay) {
  return [...new Set([currentDay, ...publishedShowings(showings)
    .map((showing) => manilaDay(showing.startTime))
    .filter((day) => day >= currentDay)])].sort().slice(0, 5);
}

export function moviesForDay(movies, showings, day) {
  const ids = new Set(publishedShowings(showings)
    .filter((showing) => manilaDay(showing.startTime) === day)
    .map((showing) => idOf(showing.movie)));
  return movies.filter((movie) => ids.has(idOf(movie)));
}

export function showingsForMovie(showings, day, movieId) {
  return publishedShowings(showings)
    .filter((showing) => manilaDay(showing.startTime) === day && idOf(showing.movie) === String(movieId))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

export function showingAvailability(showing, now = new Date()) {
  if (showing.status === 'cancelled' || showing.published === false || showing.isPublished === false) return 'cancelled';
  if (showing.bookable === false || new Date(showing.startTime) <= now) return 'started';
  if ((showing.remainingSeats ?? 0) <= 0) return 'sold out';
  return 'available';
}

export async function loadUpcomingShowings(api, signal, currentDay) {
  const showings = [];
  for (let page = 1; ; page += 1) {
    const batch = await api(`/showtimes?limit=200&page=${page}`, { signal });
    showings.push(...batch);
    const days = new Set(batch.map((showing) => manilaDay(showing.startTime)).filter((day) => day >= currentDay));
    if (batch.length < 200 || (days.size && heroDates(showings, currentDay).length === 5 &&
      batch.some((showing) => manilaDay(showing.startTime) > heroDates(showings, currentDay)[4]))) break;
  }
  return showings;
}

export const previewDates = (currentDay) => Array.from({ length: 5 }, (_, index) => shiftDay(currentDay, index));
