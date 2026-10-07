import test from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, fromInputValue, manilaClock, manilaDay, minutesOfDay, shiftDay, toInputValue } from './manila.js';

test('a Manila wall-clock time round-trips through the datetime-local input', () => {
  const instant = fromInputValue('2026-10-08T16:00');
  assert.equal(instant, '2026-10-08T08:00:00.000Z');
  assert.equal(toInputValue(instant), '2026-10-08T16:00');
});

test('days and clocks use Manila time, not UTC', () => {
  // 20:30 UTC on 7 Oct is 04:30 on 8 Oct in Manila.
  assert.equal(manilaDay('2026-10-07T20:30:00Z'), '2026-10-08');
  assert.equal(manilaClock('2026-10-07T20:30:00Z'), '04:30');
  assert.equal(minutesOfDay('2026-10-07T20:30:00Z'), 270);
  // Midnight is 00:00, never 24:00.
  assert.equal(manilaClock('2026-10-07T16:00:00Z'), '00:00');
});

test('shiftDay moves by calendar days across month ends', () => {
  assert.equal(shiftDay('2026-10-31', 1), '2026-11-01');
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
});

test('a bad input value gives null instead of throwing', () => {
  assert.equal(fromInputValue(''), null);
  assert.equal(fromInputValue('not a date'), null);
});

test('daysBetween lists every day, both ends included', () => {
  assert.deepEqual(daysBetween('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(daysBetween('2026-10-30', '2026-10-30'), ['2026-10-30']);
  assert.deepEqual(daysBetween('2026-10-31', '2026-10-30'), []);
});
