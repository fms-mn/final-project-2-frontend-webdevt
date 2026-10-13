import test from 'node:test';
import assert from 'node:assert/strict';
import { movieColor, timeAtFraction, weekDays, weekLabel, weekStart } from './schedule.js';

test('a week starts on Monday and has seven days', () => {
  assert.equal(weekStart('2026-10-13'), '2026-10-12'); // a Tuesday
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // the Monday itself
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // the Sunday belongs to the week before it
  assert.deepEqual(weekDays('2026-10-15'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
});

test('weeks that cross a month or a year still count seven days', () => {
  assert.deepEqual(weekDays('2026-12-31').at(0), '2026-12-28');
  assert.deepEqual(weekDays('2026-12-31').at(-1), '2027-01-03');
  assert.match(weekLabel('2026-09-30'), /Sep 28 – Oct 4/);
  assert.match(weekLabel('2026-10-13'), /Oct 12 – 18/);
});

test('a movie keeps its colour', () => {
  assert.equal(movieColor('abc123'), movieColor('abc123'));
  assert.match(movieColor('abc123'), /^hsl\(/);
  assert.notEqual(movieColor('a'), movieColor('b'));
});

test('a click along the timeline becomes a start time on the half hour', () => {
  assert.equal(timeAtFraction(0, 10, 22), '10:00');
  assert.equal(timeAtFraction(0.5, 10, 22), '16:00');
  assert.equal(timeAtFraction(0.55, 10, 22), '16:30'); // 16:36 rounds to the nearest half hour
  assert.equal(timeAtFraction(1, 10, 22), '22:00');
  assert.equal(timeAtFraction(-0.5, 10, 22), '10:00', 'a click before the row is clamped');
  assert.equal(timeAtFraction(2, 10, 24), '23:30', 'never later than 23:30');
});
