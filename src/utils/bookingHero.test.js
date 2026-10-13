import test from 'node:test';
import assert from 'node:assert/strict';
import { heroDates, moviesForDay, showingAvailability, showingsForMovie } from './bookingHero.js';

const day = '2026-10-08';
const at = (date, time) => new Date(date + 'T' + time + ':00+08:00').toISOString();
const movies = Array.from({ length: 7 }, (_, index) => ({ _id: 'm' + index, title: 'Movie ' + index }));
const slot = (id, movie, date = day, time = '19:00', extra = {}) => ({
  _id: id, movie: { _id: movie }, startTime: at(date, time), remainingSeats: 20,
  status: 'scheduled', published: true, ...extra,
});

test('the chooser supports six or more distinct movies and excludes unpublished or cancelled showings', () => {
  const showings = [
    ...movies.slice(0, 6).map((movie, index) => slot('s' + index, movie._id)),
    slot('cancelled', 'm6', day, '20:00', { status: 'cancelled' }),
    slot('hidden', 'm6', day, '21:00', { published: false }),
  ];
  assert.deepEqual(moviesForDay(movies, showings, day).map((movie) => movie._id), ['m0', 'm1', 'm2', 'm3', 'm4', 'm5']);
  assert.equal(showingsForMovie(showings, day, 'm0').length, 1);
});

test('dates are derived from the schedule, include Today, and permit an empty Today state', () => {
  const showings = [slot('tomorrow', 'm0', '2026-10-09'), slot('later', 'm0', '2026-10-12')];
  assert.deepEqual(heroDates(showings, day), [day, '2026-10-09', '2026-10-12']);
  assert.deepEqual(moviesForDay(movies, showings, day), []);
});

test('showings follow existing start, sold-out, and cancelled availability rules', () => {
  const now = new Date(at(day, '18:00'));
  assert.equal(showingAvailability(slot('past', 'm0', day, '17:00'), now), 'started');
  assert.equal(showingAvailability(slot('sold', 'm0', day, '19:00', { remainingSeats: 0 }), now), 'sold out');
  assert.equal(showingAvailability(slot('cancelled', 'm0', day, '19:00', { status: 'cancelled' }), now), 'cancelled');
  assert.equal(showingAvailability(slot('open', 'm0', day, '19:00'), now), 'available');
});
