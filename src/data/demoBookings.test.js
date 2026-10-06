import assert from 'node:assert/strict';
import test from 'node:test';
import { canCancelDemoBooking, cancelDemoBooking, getBookedSeats, isUpcomingDemoBooking, listDemoBookings } from './demoBookings.js';

test('cancelling a confirmed future booking persists it in history and releases its seats', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const booking = {
    _id: 'booking-1', userId: 'user-1', movieId: 'movie-1', status: 'confirmed',
    showDate: tomorrow.toISOString().slice(0, 10), showTime: '19:00', seats: ['A1'],
  };
  values.set('filme_demo_bookings', JSON.stringify([booking]));

  assert.deepEqual(getBookedSeats('movie-1', booking.showDate, booking.showTime), ['A1']);
  assert.equal(canCancelDemoBooking(booking), true);
  assert.equal(canCancelDemoBooking({ ...booking, status: 'cancelled' }), false);
  assert.equal(canCancelDemoBooking({ ...booking, showDate: '2020-01-01' }), false);
  cancelDemoBooking(booking._id, booking.userId);
  assert.equal(listDemoBookings()[0].status, 'cancelled');
  assert.equal(isUpcomingDemoBooking(listDemoBookings()[0]), false);
  assert.deepEqual(getBookedSeats('movie-1', booking.showDate, booking.showTime), []);
  assert.throws(() => cancelDemoBooking(booking._id, booking.userId), /already cancelled/);
  delete globalThis.localStorage;
});
