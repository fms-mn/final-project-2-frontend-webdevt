import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntilOpening, googleCalendarLink, openingDate } from './openingSoon.js';

test('opening dates and countdowns use Manila calendar days', () => {
  assert.equal(openingDate({ releaseDate: '2026-11-06T18:00:00Z' }), '2026-11-07');
  assert.equal(openingDate({ releaseDate: '2028-02-29' }), '2028-02-29');
  assert.equal(openingDate({ releaseDate: '2027-02-29' }), null);
  assert.equal(openingDate({ releaseDate: '2026-04-31' }), null);
  assert.equal(openingDate({ releaseDate: null }), null);
  assert.equal(openingDate({ releaseDate: 'invalid' }), null);
  assert.equal(daysUntilOpening('2026-11-07', '2026-10-08'), 30);
});

test('Google Calendar link includes the movie, all-day dates, and absolute movie page', () => {
  const movie = { _id: 'movie & 1', title: 'The Tide, Again & Again' };
  const url = new URL(googleCalendarLink(movie, '2026-12-31', 'https://filme.example'));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.pathname, '/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'The Tide, Again & Again releases today.');
  assert.equal(url.searchParams.get('dates'), '20261231/20270101');
  assert.match(url.searchParams.get('details'), /https:\/\/filme\.example\/movie\/movie%20%26%201/);
  assert.match(url.searchParams.get('details'), /Release dates may change\. Check FILME for updates\./);
  assert.equal(url.searchParams.has('location'), false);
});

test('Google Calendar all-day dates cross leap day in Manila without a time conversion', () => {
  const movie = { _id: 'leap', title: 'Leap Day' };
  const day = openingDate({ releaseDate: '2028-02-29' });
  const url = new URL(googleCalendarLink(movie, day, 'https://filme.example'));
  assert.equal(url.searchParams.get('dates'), '20280229/20280301');
});
