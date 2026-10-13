import { listDemoBookings } from './demoBookingStore.js';
import { SHOWTIMES } from '../constants/showtimes.js';
import { demoMovies } from './demoMovies.js';

export const DEMO_RULES = { turnaroundMinutes: 15, salesCutoffMinutes: 15 };
const AUDITORIUMS = [
  { id: 'aud-1', name: 'Cinema 1', capacity: 80 },
  { id: 'aud-2', name: 'Cinema 2', capacity: 80 },
  { id: 'aud-3', name: 'Premiere Hall', capacity: 80 },
  { id: 'aud-4', name: 'Cinema 4', capacity: 80 },
];
// Each fixture film owns a room. Existing booking snapshots remain untouched.
const ROOM_BY_MOVIE = Object.fromEntries(demoMovies.slice(0, 4).map((movie, index) => [movie._id, AUDITORIUMS[index].id]));
export const listAuditoriums = () => AUDITORIUMS;
export const demoShowingId = (movieId, time, day) => 'demo-' + movieId + '-' + time + (day ? '-' + day : '');
export function listShowtimes(movieId, day) {
  const movie = demoMovies.find(item => item._id === movieId);
  const auditoriumId = ROOM_BY_MOVIE[movieId];
  if (!movie || !auditoriumId) return [];
  let end = -Infinity;
  return SHOWTIMES.filter(time => {
    const [hour, minute] = time.split(':').map(Number);
    const start = hour * 60 + minute;
    if (start < end + DEMO_RULES.turnaroundMinutes) return false;
    end = start + movie.duration;
    return true;
  }).map(time => ({ id: demoShowingId(movieId, time, day), movieId, auditoriumId: savedRoom(movieId, day, time) || auditoriumId, time,
    format: '2D', language: 'English', subtitles: 'None (demo fixture)' }));
}
export function findScheduleConflicts(showings, turnaroundMinutes = DEMO_RULES.turnaroundMinutes) {
  const conflicts = [];
  const active = showings.filter(row => row.status !== 'cancelled');
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i], b = active[j];
    const room = row => row.auditorium?._id || row.auditoriumId;
    if (!room(a) || room(a) !== room(b)) continue;
    const startA = Date.parse(a.startTime), startB = Date.parse(b.startTime);
    const end = row => Date.parse(row.startTime) + (row.movie?.duration || row.duration) * 60000;
    if (startA < end(b) + turnaroundMinutes * 60000 && startB < end(a) + turnaroundMinutes * 60000) conflicts.push([a._id, b._id]);
  }
  return conflicts;
}

function savedRoom(movieId, day, time) {
  const saved = listDemoBookings().find(booking => booking.movieId === movieId && booking.showDate === day && booking.showTime === time && booking.status === 'confirmed');
  return AUDITORIUMS.some(room => room.id === saved?.auditoriumId) ? saved.auditoriumId : null;
}
export function isDemoSlotSafe(movieId, day, time) {
  const id = demoShowingId(movieId, time, day);
  const showings = demoMovies.slice(0, 4).flatMap(movie => listShowtimes(movie._id, day).map(slot => ({
    _id: slot.id, auditoriumId: slot.auditoriumId, movie,
    startTime: day + 'T' + slot.time + ':00+08:00',
  })));
  const savedRooms = new Set(listDemoBookings().filter(booking => booking.movieId === movieId && booking.showDate === day && booking.showTime === time && booking.status === 'confirmed').map(booking => booking.auditoriumId).filter(Boolean));
  if (savedRooms.size > 1 || [...savedRooms].some(room => !AUDITORIUMS.some(item => item.id === room))) return false;
  return showings.some(row => row._id === id) && !findScheduleConflicts(showings).some(pair => pair.includes(id));
}
