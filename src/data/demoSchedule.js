import { listMovies } from './catalog';
import { SHOWTIMES } from '../constants/showtimes';

// Frontend-only schedule; Express will own these records and validation later.
const AUDITORIUMS_KEY = 'filme_demo_auditoriums';
const SHOWTIMES_KEY = 'filme_demo_showtimes';
const initialAuditoriums = [
  { id: 'aud-1', name: 'Cinema 1', capacity: 80 },
  { id: 'aud-2', name: 'Cinema 2', capacity: 80 },
  { id: 'aud-3', name: 'Premiere Hall', capacity: 80 },
  { id: 'aud-4', name: 'Cinema 4', capacity: 80 },
];
function read(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
export function listAuditoriums() { return read(AUDITORIUMS_KEY, initialAuditoriums); }
export function listShowtimes(movieId) {
  const defaults = listMovies({ status: 'now_showing' }).flatMap((movie, index) =>
    SHOWTIMES.map((time) => ({ id: `default-${movie._id}-${time}`, movieId: movie._id, auditoriumId: initialAuditoriums[index % initialAuditoriums.length].id, time }))
  );
  const slots = read(SHOWTIMES_KEY, defaults);
  return movieId ? slots.filter((slot) => slot.movieId === movieId) : slots;
}
export function saveDemoAuditorium(item) {
  const name = item.name?.trim(); const capacity = Number(item.capacity);
  if (!name || !Number.isInteger(capacity) || capacity < 1 || capacity > 80) throw new Error('Enter a name and capacity from 1 to 80');
  const items = listAuditoriums(); const entry = { id: item.id || crypto.randomUUID(), name, capacity };
  const index = items.findIndex((existing) => existing.id === entry.id);
  if (index < 0) items.push(entry); else items[index] = entry;
  localStorage.setItem(AUDITORIUMS_KEY, JSON.stringify(items));
}
export function deleteDemoAuditorium(id) {
  if (listShowtimes().some((slot) => slot.auditoriumId === id)) throw new Error('Remove this auditorium’s showtimes first');
  localStorage.setItem(AUDITORIUMS_KEY, JSON.stringify(listAuditoriums().filter((item) => item.id !== id)));
}
export function saveDemoShowtime(item) {
  if (!listMovies().some((movie) => movie._id === item.movieId && movie.status === 'now_showing')) throw new Error('Choose a now showing movie');
  if (!listAuditoriums().some((auditorium) => auditorium.id === item.auditoriumId) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) throw new Error('Choose an auditorium and valid time');
  const items = listShowtimes(); const entry = { ...item, id: item.id || crypto.randomUUID() };
  if (items.some((slot) => slot.id !== entry.id && slot.auditoriumId === entry.auditoriumId && slot.time === entry.time)) throw new Error('This auditorium already has a showtime at that time');
  if (items.some((slot) => slot.id !== entry.id && slot.movieId === entry.movieId && slot.time === entry.time)) throw new Error('This movie already has a showtime at that time');
  const index = items.findIndex((slot) => slot.id === entry.id);
  if (index < 0) items.push(entry); else items[index] = entry;
  localStorage.setItem(SHOWTIMES_KEY, JSON.stringify(items));
}
export function deleteDemoShowtime(id) { localStorage.setItem(SHOWTIMES_KEY, JSON.stringify(listShowtimes().filter((slot) => slot.id !== id))); }
