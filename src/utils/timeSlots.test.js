import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMON_TIMES, TIME_OPTIONS, clock12, endOf, endsText, quickDays } from './timeSlots.js';
import { findClash } from './clashes.js';

test('clock times read the way people say them', () => {
  assert.equal(clock12('00:05'), '12:05 AM');
  assert.equal(clock12('09:30'), '9:30 AM');
  assert.equal(clock12('12:00'), '12:00 PM');
  assert.equal(clock12('16:00'), '4:00 PM');
  assert.equal(clock12('23:45'), '11:45 PM');
  assert.equal(clock12('nonsense'), '');
});

test('the time list runs from 8:00 AM to 11:45 PM in 15 minute steps', () => {
  assert.equal(TIME_OPTIONS[0].label, '8:00 AM');
  assert.equal(TIME_OPTIONS.at(-1).label, '11:45 PM');
  assert.equal(TIME_OPTIONS.length, 64);
  assert.ok(COMMON_TIMES.every((time) => TIME_OPTIONS.some((option) => option.value === time)));
});

test('the end of a show follows the movie length, even past midnight', () => {
  assert.deepEqual(endOf('16:00', 125), { clock: '18:05', nextDay: false });
  assert.deepEqual(endOf('22:30', 150), { clock: '01:00', nextDay: true });
  assert.equal(endsText('16:00', 125), 'Ends 6:05 PM');
  assert.equal(endsText('22:30', 150), 'Ends 1:00 AM (next day)');
  assert.equal(endsText('16:00', 0), '');
  assert.equal(endOf('bad', 90), null);
});

test('quick days start with Today and Tomorrow', () => {
  const days = quickDays('2026-10-13');
  assert.equal(days.length, 7);
  assert.deepEqual(days.slice(0, 2).map((item) => item.label), ['Today', 'Tomorrow']);
  assert.equal(days[2].day, '2026-10-15');
  assert.match(days[2].label, /Thu 15/);
});

const row = (id, start, end, extra = {}) => ({ _id: id, auditorium: { _id: 'A' }, status: 'scheduled', startTime: start, endTime: end, ...extra });
const at = (clock) => new Date(`2026-10-14T${clock}:00+08:00`).getTime();

test('clashes: overlapping, too close, and fine', () => {
  const existing = [row('1', '2026-10-14T10:00:00+08:00', '2026-10-14T12:00:00+08:00')];
  const ask = (from, to, extra = {}) => findClash(existing, { auditorium: 'A', startMs: at(from), endMs: at(to), gapMinutes: 15, ...extra });
  assert.equal(ask('11:00', '13:00')?._id, '1', 'overlaps');
  assert.equal(ask('12:10', '14:00')?._id, '1', 'starts inside the 15 minute gap');
  assert.equal(ask('12:15', '14:00'), null, 'exactly the gap is fine');
  assert.equal(ask('08:00', '09:45'), null, 'ends exactly one gap before');
  assert.equal(ask('08:00', '09:50')?._id, '1', 'ends inside the gap before');
  assert.equal(ask('11:00', '13:00', { auditorium: 'B' }), null, 'another room is free');
  assert.equal(ask('11:00', '13:00', { ignoreId: '1' }), null, 'a showing does not clash with itself');
});

test('cancelled showings never clash', () => {
  const existing = [row('1', '2026-10-14T10:00:00+08:00', '2026-10-14T12:00:00+08:00', { status: 'cancelled' })];
  assert.equal(findClash(existing, { auditorium: 'A', startMs: at('10:30'), endMs: at('12:30'), gapMinutes: 15 }), null);
});
