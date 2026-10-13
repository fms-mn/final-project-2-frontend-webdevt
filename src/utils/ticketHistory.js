import { getDemoBookingReference } from '../data/demoBookings.js';
import { manilaDay } from './manila.js';

export const bookingWhen = booking => new Date(booking.showtime?.startTime || `${booking.showDate}T${booking.showTime}:00+08:00`);

export function selectHistory(bookings, { filter = 'all', query = '', order = 'newest', now = Date.now() } = {}) {
  const search = query.trim().toLocaleLowerCase();
  return bookings.filter(booking => {
    if (filter === 'cancelled' && booking.status !== 'cancelled') return false;
    if (filter === 'past' && !(booking.status === 'confirmed' && bookingWhen(booking).getTime() <= now)) return false;
    const reference = booking.bookingCode || getDemoBookingReference(booking);
    return !search || `${booking.movie?.title || ''}\n${reference}`.toLocaleLowerCase().includes(search);
  }).sort((a, b) => {
    const difference = (bookingWhen(a).getTime() || 0) - (bookingWhen(b).getTime() || 0);
    return (order === 'oldest' ? difference : -difference) || String(a._id).localeCompare(String(b._id));
  });
}

export async function loadCustomerBookings(request, signal) {
  const records = new Map();
  for (let page = 1; ; page += 1) {
    const result = await request(`/bookings/my?limit=200&page=${page}`, { signal });
    if (!Array.isArray(result)) throw new Error('Booking information is unavailable. Please try again.');
    const before = records.size;
    for (const booking of result) records.set(booking._id, booking);
    if (result.length < 200) return [...records.values()];
    if (records.size === before) throw new Error('Booking pages could not be verified. Please try again.');
  }
}

export function groupHistory(bookings, visibleCount) {
  const dayOf = booking => Number.isFinite(bookingWhen(booking).getTime()) ? manilaDay(bookingWhen(booking)) : 'unknown';
  const totals = new Map();
  for (const booking of bookings) { const day = dayOf(booking); totals.set(day, (totals.get(day) || 0) + 1); }
  const groups = new Map();
  for (const booking of bookings.slice(0, visibleCount)) {
    const day = dayOf(booking);
    if (!groups.has(day)) groups.set(day, { day, total: totals.get(day), bookings: [] });
    groups.get(day).bookings.push(booking);
  }
  return [...groups.values()];
}
