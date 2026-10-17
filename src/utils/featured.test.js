import test from 'node:test';
import assert from 'node:assert/strict';
import { dayWord, pickFeatured } from './featured.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-15T04:00:00Z'); // noon in Manila
const movie = (title, status, hoursAway, extra = {}) => ({
  _id: title, title, status, upcomingShowings: 2, nextShowing: new Date(NOW + hoursAway * HOUR).toISOString(), ...extra,
});

test('the ticket features a movie that can be booked, never one that cannot', () => {
  assert.equal(pickFeatured([], NOW), null);
  assert.equal(pickFeatured([movie('A', 'not_showing', 5), movie('B', 'now_showing', 5, { upcomingShowings: 0 }), movie('C', 'now_showing', 5, { nextShowing: null })], NOW), null);
  assert.equal(pickFeatured([movie('Past', 'now_showing', -2)], NOW), null, 'a showing that already started is not offered');
});

test('a movie already showing comes first, then the soonest showing, then the title', () => {
  const later = movie('Later', 'now_showing', 30);
  const sooner = movie('Sooner', 'now_showing', 6);
  const soon = movie('Soon', 'coming_soon', 1);
  assert.equal(pickFeatured([later, soon, sooner], NOW).title, 'Sooner');
  assert.equal(pickFeatured([later, soon], NOW).title, 'Later', 'now showing beats an advance-ticket movie');
  assert.equal(pickFeatured([soon], NOW).title, 'Soon', 'advance tickets are offered when nothing else is on');
  assert.equal(pickFeatured([movie('Bravo', 'now_showing', 6), movie('Alpha', 'now_showing', 6)], NOW).title, 'Alpha');
});

test('the day reads as Today, Tomorrow, or the date', () => {
  const now = new Date(NOW);
  assert.equal(dayWord(new Date(NOW + 3 * HOUR), now), 'Today');
  assert.equal(dayWord(new Date(NOW + 24 * HOUR), now), 'Tomorrow');
  assert.match(dayWord(new Date(NOW + 72 * HOUR), now), /^\w{3}, \w{3} \d+$/);
});
