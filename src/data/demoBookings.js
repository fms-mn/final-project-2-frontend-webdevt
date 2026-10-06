import { listAuditoriums, listShowtimes } from './demoSchedule.js';

// DEMO ONLY: bookings are kept in this browser until the booking API is connected.
// An Express API must enforce ownership, seat availability, and cancellation rules later.
const BOOKINGS_KEY = 'filme_demo_bookings';
const SEAT_PATTERN = /^[A-H](10|[1-9])$/;

export function listDemoBookings() {
  try {
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
}

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

export function createDemoBooking({ userId, movie, seats, showDate, showTime }) {
  const movieId = movie?._id;
  if (!userId || !movieId || movie.status !== 'now_showing') {
    throw new Error('This movie is not available for booking');
  }
  if (!Array.isArray(seats) || seats.length === 0 ||
      new Set(seats).size !== seats.length || seats.some((seat) => !SEAT_PATTERN.test(seat))) {
    throw new Error('Choose valid seats before confirming');
  }
  const slot = listShowtimes(movieId).find((item) => item.time === showTime);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate) || !slot) {
    throw new Error('Choose a valid date and showtime');
  }
  if (new Date(`${showDate}T${showTime}:00`).getTime() <= Date.now()) throw new Error('Choose a future showtime');
  const capacity = listAuditoriums().find((item) => item.id === slot.auditoriumId)?.capacity || 80;
  if (seats.some((seat) => (seat.charCodeAt(0) - 65) * 10 + Number(seat.slice(1)) > capacity)) throw new Error('Choose seats in this auditorium');

  const conflicts = getBookedSeats(movieId, showDate, showTime);
  if (seats.some((seat) => conflicts.includes(seat))) {
    throw new Error('One or more selected seats have already been booked');
  }

  const booking = {
    _id: crypto.randomUUID(),
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
  return `FM-${booking._id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

export function isUpcomingDemoBooking(booking) {
  return booking.status === 'confirmed' && new Date(`${booking.showDate}T${booking.showTime}:00`).getTime() > Date.now();
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
