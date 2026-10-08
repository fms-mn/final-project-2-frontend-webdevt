import test from 'node:test';
import assert from 'node:assert/strict';
import { groupShowtimesByTime, isBookableShowing, showingStatus } from './showtimesBoard.js';

test('groups one and six movies by time, retaining different rooms at the same time', () => {
  for (const count of [1, 6]) {
    const movies = Array.from({ length: count }, (_, i) => ({ _id: `m${i}`, title: `Film ${i}` }));
    const rows = movies.flatMap(movie => [
      { id: `${movie._id}-b`, movie, time: '19:00', room: 'Room B' },
      { id: `${movie._id}-a`, movie, time: '19:00', room: 'Room A' },
      { id: `${movie._id}-early`, movie, time: '16:00', room: 'Room A' },
    ]);
    const groups = groupShowtimesByTime(rows);
    assert.deepEqual(groups.map(group => group.time), ['16:00', '19:00']);
    assert.equal(groups[0].showings.length, count);
    assert.equal(groups[1].showings.length, count * 2);
    assert.deepEqual(groups[1].showings.slice(0, 2).map(row => row.room), ['Room B', 'Room A']);
  }
});

test('availability and Manila-style clock labels distinguish every state', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const later = '2026-10-08T19:00:00Z';
  assert.equal(showingStatus({ status: 'cancelled', startTime: later, remainingSeats: 80 }, now), 'CANCELLED');
  assert.equal(showingStatus({ startTime: '2026-10-08T11:00:00Z', remainingSeats: 80 }, now), 'STARTED');
  assert.equal(showingStatus({ startTime: later, remainingSeats: 0 }, now), 'SOLD OUT');
  assert.equal(showingStatus({ startTime: later, remainingSeats: 8 }, now), 'FEW SEATS');
  assert.equal(showingStatus({ startTime: later, remainingSeats: 30 }, now), 'OPEN');
  assert.equal(isBookableShowing({ status: 'FEW SEATS', seats: 8 }), true);
  assert.equal(isBookableShowing({ status: 'CANCELLED', seats: 80 }), false);
});
