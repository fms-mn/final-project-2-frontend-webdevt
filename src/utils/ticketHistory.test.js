import test from 'node:test';
import assert from 'node:assert/strict';
import { groupHistory, loadCustomerBookings, selectHistory } from './ticketHistory.js';
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
test('each History request loads one five-record backend page with search/filter/sort', async () => {
  const calls = [], signal = new AbortController().signal;
  const rows = Array.from({ length: 5 }, (_, i) => ({ ...records[0], _id: 'row-' + i }));
  const result = await loadCustomerBookings(async (path, options) => {
    calls.push(path); assert.equal(options.signal, signal);
    return { records: rows, total: 120, overallTotal: 150, page: 2, hasMore: true, nextPage: 3 };
  }, { scope: 'history', page: 2, filter: 'cancelled', query: 'Target film', order: 'oldest', signal });
  assert.equal(result.records.length, 5);
  assert.deepEqual(calls, ['/bookings/my?scope=history&limit=5&page=2&filter=cancelled&search=Target+film&order=oldest']);
});

test('invalid pagination metadata fails visibly and Upcoming is requested independently', async () => {
  const options = { scope: 'history' };
  await assert.rejects(loadCustomerBookings(async () => ({}), options), /unavailable/);
  await assert.rejects(loadCustomerBookings(async () => ({ records: [], total: 100, overallTotal: 100, page: 1, hasMore: true, nextPage: 1 }), options), /unavailable/);
  await loadCustomerBookings(async path => {
    assert.ok(path.includes('scope=upcoming&limit=50&page=1'));
    return { records: [], total: 0, overallTotal: 0, page: 1, hasMore: false, nextPage: null };
  }, { scope: 'upcoming' });
});

test('date groups retain sort order and merge when Load more splits the same Manila day', () => {
  const sameDay = Array.from({ length: 7 }, (_, i) => ({ ...records[0], _id: `same-${i}`, showtime: { startTime: `2026-10-11T${String(10 + i).padStart(2, '0')}:00:00+08:00` } }));
  const selected = selectHistory([...sameDay, records[1]], { now });
  const initial = groupHistory(selected, 5);
  assert.deepEqual(initial.map(group => group.day), ['2026-10-14', '2026-10-11']);
  assert.equal(initial[1].total, 7);
  assert.equal(groupHistory(selected.slice(0, 5), 5, { '2026-10-11': 7 })[1].total, 7);
  assert.equal(initial[1].bookings.length, 4);
  const more = groupHistory(selected, 10);
  assert.equal(more.length, 2);
  assert.equal(more[1].bookings.length, 7);
  assert.deepEqual(more.flatMap(group => group.bookings.map(row => row._id)), selected.map(row => row._id));
  assert.equal(groupHistory([{ ...records[1], showtime: null }], 5)[0].day, 'unknown');
});
