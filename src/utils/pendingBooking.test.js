import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingDestination, clearPendingBooking, postAuthDestination, readPendingBooking, restoreTentativeSeats, savePendingBooking, validatePendingBooking } from './pendingBooking.js';

const now = Date.now();
const selection = { movieId: 'movie-1', showtimeId: 'screening-2', date: '2026-10-15', time: '18:30', seats: ['A1', 'B2'] };
const record = { ...selection, version: 1, savedAt: now };
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };

test('booking return survives repeated reads and produces only a scoped internal destination', () => {
  const session = storage();
  clearPendingBooking(session);
  savePendingBooking(selection, session, now);
  assert.deepEqual(readPendingBooking(session, now), record);
  assert.deepEqual(readPendingBooking(session, now), record);
  assert.equal(postAuthDestination({ role: 'user' }, { pathname: '//evil.example' }, session), bookingDestination(record));
  clearPendingBooking(session);
  assert.equal(readPendingBooking(session, now), null);
});

test('return data rejects URLs, invalid dates, invalid seats, expiry and unsupported versions', () => {
  for (const changes of [{ movieId: '//evil.example' }, { showtimeId: '../admin' }, { date: '2026-02-30' }, { time: '24:00' },
    { seats: ['A1', 'A1'] }, { seats: ['<script>'] }, { seats: Array.from({ length: 11 }, (_, i) => `A${i + 1}`) },
    { savedAt: now - 7200001 }, { savedAt: now + 1 }, { version: 2 }]) {
    assert.equal(validatePendingBooking({ ...record, ...changes }, now), null);
  }
});

test('admin ignores booking return; ordinary customer returns cannot escape allowed protected routes', () => {
  const session = storage();
  savePendingBooking(selection, session, now);
  assert.equal(postAuthDestination({ role: 'admin' }, { pathname: '/profile' }, session), '/admin');
  assert.equal(readPendingBooking(session, now), null);
  for (const pathname of ['https://evil.example', '//evil.example', '/\\evil.example', '/admin', '/admin/settings', '/movie/1', '/home']) {
    assert.equal(postAuthDestination({ role: 'user' }, { pathname }, session), '/');
  }
  assert.equal(postAuthDestination({ role: 'user' }, { pathname: '/my-bookings', search: '?next=https://evil.example' }, session), '/my-bookings');
});

test('tentative seats are restored only if labels remain available in the fresh seat map', () => {
  assert.deepEqual(restoreTentativeSeats(['A1', 'A2', 'Z99'], ['A1', 'B1']), { seats: ['A1'], unavailable: ['A2', 'Z99'] });
});

test('corrupt or removed session records cannot revive the in-memory return', () => {
  const session = storage();
  savePendingBooking(selection, session, now);
  session.setItem('filme:pending-booking:v1', '{broken');
  assert.equal(readPendingBooking(session, now), null);
  savePendingBooking(selection, session, now);
  session.removeItem('filme:pending-booking:v1');
  assert.equal(readPendingBooking(session, now), null);
});

test('a movie clicked before choosing a showing returns to its public details without inventing a screening', () => {
  const session = storage();
  const movieOnly = { movieId: 'movie-1', showtimeId: null, date: null, time: null, seats: [] };
  savePendingBooking(movieOnly, session, now);
  assert.equal(postAuthDestination({ role: 'user' }, null, session), '/movie/movie-1');
  assert.equal(readPendingBooking(session, now).showtimeId, null);
  for (const changes of [{ seats: ['A1'] }, { date: '2026-10-15' }, { time: '18:30' }, { showtimeId: 'screening-1' }]) {
    assert.equal(validatePendingBooking({ ...movieOnly, ...changes, version: 1, savedAt: now }, now), null);
  }
  clearPendingBooking(session);
});
