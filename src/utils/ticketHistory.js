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

export async function loadCustomerBookings(request, { scope, page = 1, filter = 'all', query = '', order = 'newest', signal }) {
  const params = new URLSearchParams({ scope, limit: scope === 'history' ? '5' : '50', page: String(page), filter, search: query, order });
  const result = await request(`/bookings/my?${params}`, { signal });
  if (!Array.isArray(result?.records) || !Number.isInteger(result.total) || result.total < 0
    || !Number.isInteger(result.overallTotal) || result.overallTotal < result.total
    || result.page !== page || typeof result.hasMore !== 'boolean'
    || (result.hasMore ? result.nextPage !== page + 1 : result.nextPage !== null)) {
    throw new Error('Booking information is unavailable. Please try again.');
  }
  return result;
}

export function groupHistory(bookings, visibleCount = bookings.length, dayCounts) {
  const dayOf = booking => Number.isFinite(bookingWhen(booking).getTime()) ? manilaDay(bookingWhen(booking)) : 'unknown';
  const totals = new Map();
  for (const booking of bookings) { const day = dayOf(booking); totals.set(day, (totals.get(day) || 0) + 1); }
  const groups = new Map();
  for (const booking of bookings.slice(0, visibleCount)) {
    const day = dayOf(booking);
    if (!groups.has(day)) groups.set(day, { day, total: dayCounts?.[day] ?? totals.get(day), bookings: [] });
    groups.get(day).bookings.push(booking);
  }
  return [...groups.values()];
}
