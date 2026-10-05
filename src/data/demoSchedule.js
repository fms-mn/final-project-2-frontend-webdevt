import { SHOWTIMES } from '../constants/showtimes';

// DEMO ONLY: a fixed daily schedule. Real auditoriums and showtimes arrive with the showtime API;
// until then every movie shows at the same times, spread across four sample auditoriums.
const AUDITORIUMS = [
  { id: 'aud-1', name: 'Cinema 1', capacity: 80 },
  { id: 'aud-2', name: 'Cinema 2', capacity: 80 },
  { id: 'aud-3', name: 'Premiere Hall', capacity: 80 },
  { id: 'aud-4', name: 'Cinema 4', capacity: 80 },
];

export function listAuditoriums() {
  return AUDITORIUMS;
}

// The same movie always lands in the same auditorium.
function auditoriumFor(movieId) {
  const total = [...String(movieId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AUDITORIUMS[total % AUDITORIUMS.length];
}

export function listShowtimes(movieId) {
  if (!movieId) return [];
  const auditorium = auditoriumFor(movieId);
  return SHOWTIMES.map((time) => ({
    id: `demo-${movieId}-${time}`,
    movieId,
    auditoriumId: auditorium.id,
    time,
  }));
}
