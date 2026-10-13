import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCustomerBookings, selectHistory } from './ticketHistory.js';
const now = Date.parse('2026-10-13T12:00:00+08:00');
const records = [
  { _id: 'past', status: 'confirmed', movie: { title: 'Midnight Signal' }, bookingCode: 'FLM-PAST', showtime: { startTime: '2026-10-11T20:00:00+08:00' } },
  { _id: 'cancelled', status: 'cancelled', movie: { title: 'Long Journey' }, bookingCode: 'FLM-CANCEL', showtime: { startTime: '2026-10-14T20:00:00+08:00' } },
  { _id: 'older', status: 'confirmed', movie: { title: 'Old Film' }, bookingCode: 'FLM-OLDER', showDate: '2026-10-01', showTime: '19:00' },
];
test('History filters and sorts by showtime without assuming attendance', () => {
  assert.deepEqual(selectHistory(records, { now }).map(row => row._id), ['cancelled', 'past', 'older']);
  assert.deepEqual(selectHistory(records, { filter: 'cancelled', now }).map(row => row._id), ['cancelled']);
  assert.deepEqual(selectHistory(records, { filter: 'past', order: 'oldest', now }).map(row => row._id), ['older', 'past']);
  assert.equal(records[0]._id, 'past', 'stored records are not reordered');
});
test('movie-title and reference search is applied before the five-row slice', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...records[0], _id: `row-${i}`, bookingCode: `FLM-${i}`, movie: { title: i > 5 ? 'Target film' : 'Other' } }));
  assert.equal(selectHistory(many, { query: ' target FILM ' }).slice(0, 5).length, 5);
  assert.equal(selectHistory(many, { query: 'flm-11' })[0]._id, 'row-11');
  assert.equal(selectHistory(many, { query: 'missing' }).length, 0);
});
test('all existing API pages are loaded before filtering History', async () => {
  const calls = [];
  const first = Array.from({ length: 200 }, (_, i) => ({ ...records[0], _id: `row-${i}`, bookingCode: `FLM-${i}` }));
  const signal = new AbortController().signal;
  const result = await loadCustomerBookings(async (path, options) => {
    calls.push(path); assert.equal(options.signal, signal);
    return calls.length === 1 ? first : [records[1]];
  }, signal);
  assert.equal(result.length, 201);
  assert.deepEqual(calls, ['/bookings/my?limit=200&page=1', '/bookings/my?limit=200&page=2']);
  assert.equal(selectHistory(result, { query: 'flm-cancel' }).length, 1, 'second-page records remain searchable');
});
test('invalid or repeated API pages fail visibly instead of using a partial list', async () => {
  await assert.rejects(loadCustomerBookings(async () => ({})), /unavailable/);
  const page = Array.from({ length: 200 }, (_, i) => ({ _id: `row-${i}` }));
  await assert.rejects(loadCustomerBookings(async () => page), /could not be verified/);
});
