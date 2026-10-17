import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionItems, dayFacts, fractionOfDay, seatsSold, showingState } from './showingsOverview.js';

const NOW = new Date('2026-10-17T02:00:00Z');
const later = '2026-10-17T10:00:00Z';
const earlier = '2026-10-17T00:00:00Z';

test('attention lists drafts that have showings, then released movies with nothing to book', () => {
  const movies = [
    { _id: 'a', title: 'Draft with shows', status: 'draft', upcomingShowings: 2 },
    { _id: 'b', title: 'Draft, no shows', status: 'draft', upcomingShowings: 0 },
    { _id: 'c', title: 'Released, empty', status: 'published', showStatus: 'not_showing', upcomingShowings: 0 },
    { _id: 'd', title: 'Coming soon', status: 'published', showStatus: 'coming_soon', upcomingShowings: 0 },
    { _id: 'e', title: 'Healthy', status: 'published', showStatus: 'now_showing', upcomingShowings: 4 },
    { _id: 'f', title: 'Archived', status: 'archived', showStatus: 'not_showing' },
  ];
  assert.deepEqual(attentionItems(movies).map((item) => [item.kind, item.movie._id]), [['draft', 'a'], ['empty', 'c']]);
  assert.equal(attentionItems(movies)[0].count, 2);
  assert.deepEqual(attentionItems(), []);
});

test('day facts count scheduled, hidden and cancelled showings', () => {
  const rows = [
    { status: 'scheduled', published: true }, { status: 'scheduled', published: false },
    { status: 'cancelled', published: true }, { status: 'scheduled', published: true },
  ];
  assert.deepEqual(dayFacts(rows), { scheduled: 3, hidden: 1, cancelled: 1 });
  assert.deepEqual(dayFacts(), { scheduled: 0, hidden: 0, cancelled: 0 });
});

test('a showing is cancelled, started, hidden or on sale', () => {
  const base = { status: 'scheduled', published: true, startTime: later };
  assert.equal(showingState({ ...base, status: 'cancelled' }, { now: NOW }), 'cancelled');
  assert.equal(showingState({ ...base, startTime: earlier }, { now: NOW }), 'started');
  assert.equal(showingState({ ...base, published: false }, { now: NOW }), 'hidden');
  assert.equal(showingState(base, { movieStatus: 'draft', now: NOW }), 'hidden');
  assert.equal(showingState(base, { movieStatus: 'published', now: NOW }), 'on-sale');
});

test('seats sold never goes below zero', () => {
  assert.equal(seatsSold({ totalSeats: 120, remainingSeats: 78 }), 42);
  assert.equal(seatsSold({ totalSeats: 10, remainingSeats: 12 }), 0);
});

test('a clock time maps onto the visible hours', () => {
  assert.equal(fractionOfDay('10:00', 10, 22), 0);
  assert.equal(fractionOfDay('16:00', 10, 22), 0.5);
  assert.equal(fractionOfDay('22:00', 10, 22), 1);
});
