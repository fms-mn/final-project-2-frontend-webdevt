import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingSchedule, chooseScheduleSelection, loadMovieSchedule } from './bookingSchedule.js';

const now = Date.parse('2026-10-10T12:00:00+08:00');
const slot = (id, startTime, remainingSeats = 10, extra = {}) => ({ _id: id, movie: { _id: 'movie' }, startTime, remainingSeats, ...extra });
const scheduleOf = rows => bookingSchedule(rows, 'movie', '2026-10-10', '2026-10-16', now);

test('schedule hides empty, past, cancelled and out-of-range dates; groups in Manila and keeps sold-out slots', () => {
  const schedule = scheduleOf([
    slot('later', '2026-10-12T12:00:00Z'), slot('midnight', '2026-10-10T16:30:00Z', 0),
    slot('past', '2026-10-10T02:00:00Z'), slot('cancelled', '2026-10-13T12:00:00Z', 10, { status: 'cancelled' }),
    slot('other', '2026-10-14T12:00:00Z', 10, { movie: 'other' }), slot('outside', '2026-10-17T12:00:00Z'),
  ]);
  assert.deepEqual(schedule.dates, ['2026-10-11', '2026-10-12']);
  assert.deepEqual(schedule.slots.map(s => s.id), ['midnight', 'later']);
  assert.equal(schedule.slots[0].time, '00:30');
  assert.equal(chooseScheduleSelection(schedule, {}).slot.id, 'later');
});

test('direct showing is preserved, sold-out date can be chosen, and invalid selection falls back safely', () => {
  const schedule = scheduleOf([slot('full', '2026-10-11T10:00:00+08:00', 0), slot('early', '2026-10-12T10:00:00+08:00'), slot('late', '2026-10-12T18:00:00+08:00')]);
  assert.equal(chooseScheduleSelection(schedule, { showtimeId: 'late' }).slot.id, 'late');
  assert.equal(chooseScheduleSelection(schedule, { date: '2026-10-12', time: '18:00' }).slot.id, 'late');
  assert.deepEqual(chooseScheduleSelection(schedule, { date: '2026-10-11', preserveDate: true }), { date: '2026-10-11', slot: null });
  assert.equal(chooseScheduleSelection(schedule, { showtimeId: 'removed', date: '2026-10-13', preserveDate: true }).slot.id, 'early');
  const full = scheduleOf([slot('full', '2026-10-11T10:00:00+08:00', 0)]);
  assert.deepEqual(chooseScheduleSelection(full, {}), { date: '2026-10-11', slot: null });
  assert.deepEqual(chooseScheduleSelection(scheduleOf([]), {}), { date: '', slot: null });
});

test('schedule loader uses movie pagination and distinguishes invalid data and network errors from empty', async () => {
  const calls = [];
  const rows = Array.from({ length: 200 }, (_, i) => slot(String(i), '2026-10-11T10:00:00+08:00'));
  const result = await loadMovieSchedule(async url => { calls.push(url); return calls.length === 1 ? rows : []; }, 'movie', '2026-10-16');
  assert.equal(result.length, 200);
  assert.match(calls[1], /movie=movie&limit=200&page=2/);
  assert.deepEqual(await loadMovieSchedule(async () => [], 'movie', '2026-10-16'), []);
  await assert.rejects(loadMovieSchedule(async () => [{}], 'movie', '2026-10-16'), /Invalid showing/);
  await assert.rejects(loadMovieSchedule(async () => { throw new Error('Offline'); }, 'movie', '2026-10-16'), /Offline/);
});
