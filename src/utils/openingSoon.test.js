import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntilOpening, openingDate } from './openingSoon.js';

test('opening dates and countdowns use Manila calendar days', () => {
  assert.equal(openingDate({ releaseDate: '2026-11-06T18:00:00Z' }), '2026-11-07');
  assert.equal(openingDate({ releaseDate: '2028-02-29' }), '2028-02-29');
  assert.equal(openingDate({ releaseDate: '2027-02-29' }), null);
  assert.equal(openingDate({ releaseDate: '2026-04-31' }), null);
  assert.equal(openingDate({ releaseDate: null }), null);
  assert.equal(openingDate({ releaseDate: 'invalid' }), null);
  assert.equal(daysUntilOpening('2026-11-07', '2026-10-08'), 30);
});
