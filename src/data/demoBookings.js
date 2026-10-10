import { manilaDay } from '../utils/manila.js';
import { listDemoBookings } from './demoBookingStore.js';
export { listDemoBookings } from './demoBookingStore.js';
import { DEMO_RULES, isDemoSlotSafe, listAuditoriums, listShowtimes } from './demoSchedule.js';

// Local preview bookings for the development demo account.
const BOOKINGS_KEY = 'filme_demo_bookings';
const SEAT_PATTERN = /^[A-H](10|[1-9])$/;


export function getBookedSeats(movieId, showDate, showTime) {
  return listDemoBookings()
    .filter((booking) =>
      booking.movieId === movieId &&
      booking.showDate === showDate &&
      booking.showTime === showTime &&
      booking.status === 'confirmed'
    )
    .flatMap((booking) => booking.seats);
}

export function getReservedDemoSeats(movieId, showDate, showTime) {
  const slot = listShowtimes(movieId, showDate).find(item => item.time === showTime);
  if (!slot) return getBookedSeats(movieId, showDate, showTime);
  const capacity = listAuditoriums().find(room => room.id === slot.auditoriumId).capacity;
  const fixtureCount = movieId === 'demo-city-after-dark' && showTime === '19:00' ? capacity - 6
    : movieId === 'demo-blue-hour' && showTime === '19:00' ? capacity : 12;
  const fixtureSeats = Array.from({ length: fixtureCount }, (_, index) => {
    const seat = capacity - index - 1;
    return String.fromCharCode(65 + Math.floor(seat / 10)) + (seat % 10 + 1);
  });
  return [...new Set([...fixtureSeats, ...getBookedSeats(movieId, showDate, showTime)])];
}
export function demoRemainingSeats(movieId, showDate, showTime) {
  const slot = listShowtimes(movieId, showDate).find(item => item.time === showTime);
  const capacity = listAuditoriums().find(room => room.id === slot?.auditoriumId)?.capacity || 0;
  return Math.max(0, capacity - getReservedDemoSeats(movieId, showDate, showTime).length);
}
export function createDemoBooking({ userId, movie, seats, showDate, showTime, showingId }) {
  const movieId = movie?._id;
  if (userId !== 'demo-user' || !movieId || movie.status !== 'now_showing') {
    throw new Error('This movie is not available for booking');
  }
  if (!Array.isArray(seats) || seats.length === 0 ||
      new Set(seats).size !== seats.length || seats.some((seat) => !SEAT_PATTERN.test(seat))) {
    throw new Error('Choose valid seats before confirming');
  }
  const slot = listShowtimes(movieId, showDate).find((item) => item.time === showTime);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate) || manilaDay(showDate + 'T' + showTime + ':00+08:00') !== showDate || !slot || slot.id !== showingId || !isDemoSlotSafe(movieId, showDate, showTime)) {
    throw new Error('Choose a valid date and showtime');
  }
  if (new Date(`${showDate}T${showTime}:00+08:00`).getTime() <= Date.now() + DEMO_RULES.salesCutoffMinutes * 60000) throw new Error('Choose a future showtime');
  const capacity = listAuditoriums().find((item) => item.id === slot.auditoriumId)?.capacity || 80;
  if (seats.some((seat) => (seat.charCodeAt(0) - 65) * 10 + Number(seat.slice(1)) > capacity)) throw new Error('Choose seats in this auditorium');

  const conflicts = getReservedDemoSeats(movieId, showDate, showTime);
  if (seats.some((seat) => conflicts.includes(seat))) {
    throw new Error('One or more selected seats have already been booked');
  }

  const booking = {
    _id: crypto.randomUUID(),
    isDemo: true,
    showingId,
    userId,
    movieId,
    seats: [...seats],
    showDate,
    showTime,
    auditoriumId: slot.auditoriumId,
    totalPrice: seats.length * movie.price,
    // A snapshot, so My Bookings can show the movie without loading it again.
    movie: { _id: movieId, title: movie.title, posterUrl: movie.posterUrl },
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify([...listDemoBookings(), booking]));
  return booking;
}

export function getDemoBookings(userId) {
  return listDemoBookings()
    .filter((booking) => booking.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoBookingReference(booking) {
  return `FLM-${booking._id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

export function isUpcomingDemoBooking(booking) {
  return booking.status === 'confirmed' && new Date(`${booking.showDate}T${booking.showTime}:00+08:00`).getTime() > Date.now();
}

export function cancelDemoBooking(bookingId, userId) {
  const bookings = listDemoBookings();
  const booking = bookings.find((item) => item._id === bookingId && item.userId === userId);
  if (!booking) throw new Error('Booking not found');
  if (booking.status === 'cancelled') throw new Error('Booking already cancelled');
  if (!canCancelDemoBooking(booking)) throw new Error('Only future bookings can be cancelled');

  booking.status = 'cancelled';
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  return booking;
}

export function canCancelDemoBooking(booking) {
  return isUpcomingDemoBooking(booking);
}
