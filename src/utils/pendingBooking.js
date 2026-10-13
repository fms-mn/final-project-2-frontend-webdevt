import { MAX_SEATS_PER_BOOKING } from './seatSelection.js';

const KEY = 'filme:pending-booking:v1';
const MAX_AGE = 2 * 60 * 60 * 1000;
const idPattern = /^[a-zA-Z0-9_-]{1,160}$/;
let memory = null;

export function validatePendingBooking(value, now = Date.now()) {
  if (!value || value.version !== 1 || typeof value.movieId !== 'string' || !idPattern.test(value.movieId) ||
      !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt > MAX_AGE ||
      !Array.isArray(value.seats) || value.seats.length > MAX_SEATS_PER_BOOKING ||
      value.seats.some(seat => typeof seat !== 'string' || !/^[A-Z][1-9]\d?$/.test(seat)) ||
      new Set(value.seats).size !== value.seats.length) return null;
  const movieOnly = value.showtimeId === null && value.date === null && value.time === null && value.seats.length === 0;
  if (!movieOnly && (typeof value.showtimeId !== 'string' || !idPattern.test(value.showtimeId) ||
      typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
      !Number.isFinite(Date.parse(value.date)) || new Date(value.date).toISOString().slice(0, 10) !== value.date ||
      typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time))) return null;
  return { version: 1, movieId: value.movieId, showtimeId: value.showtimeId, date: value.date,
    time: value.time, seats: [...value.seats], savedAt: value.savedAt };
}

export function clearPendingBooking(storage) {
  memory = null;
  try { (storage ?? globalThis.sessionStorage)?.removeItem(KEY); } catch { /* Storage may be disabled. */ }
}

export function readPendingBooking(storage, now = Date.now()) {
  let value = memory;
  let raw;
  try {
    const target = storage ?? globalThis.sessionStorage;
    if (target) { raw = target.getItem(KEY); value = null; }
  } catch { /* Keep the current-tab fallback when storage is disabled. */ }
  if (raw) {
    try { value = JSON.parse(raw); } catch { value = null; }
  }
  const pending = validatePendingBooking(value, now);
  if (!pending) clearPendingBooking(storage);
  return pending;
}

export function savePendingBooking(selection, storage, now = Date.now()) {
  const pending = validatePendingBooking({ ...selection, version: 1, savedAt: now }, now);
  if (!pending) { clearPendingBooking(storage); return null; }
  memory = pending;
  try { (storage ?? globalThis.sessionStorage)?.setItem(KEY, JSON.stringify(pending)); } catch { /* Navigation still works within this page session. */ }
  return pending;
}

export function bookingDestination(pending) {
  if (pending.showtimeId === null) return `/movie/${pending.movieId}`;
  return `/movie/${pending.movieId}?${new URLSearchParams({ date: pending.date, time: pending.time, showtime: pending.showtimeId })}`;
}

export function postAuthDestination(user, from, storage) {
  if (user.role === 'admin') { clearPendingBooking(storage); return '/admin'; }
  const pending = readPendingBooking(storage);
  if (pending) return bookingDestination(pending);
  return ['/my-bookings', '/profile'].includes(from?.pathname) ? from.pathname : '/';
}

export function restoreTentativeSeats(pendingSeats, availableSeats) {
  const available = new Set(availableSeats);
  return { seats: pendingSeats.filter(seat => available.has(seat)), unavailable: pendingSeats.filter(seat => !available.has(seat)) };
}
