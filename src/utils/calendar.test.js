import test from 'node:test';
import assert from 'node:assert/strict';
import { validDay, dateProblem, enabledDay, monthDays, monthOffset, selectionLimits } from './calendar.js';
import { movieErrors } from './movieForm.js';
import { today, shiftDay } from './manila.js';

test('calendar dates validate real days without changing the entered calendar date', () => {
  assert(validDay('1995-11-22'));
  assert(validDay('2028-02-29'));
  assert(validDay('0001-01-01'));
  for (const day of ['2027-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '2026-10-16T00:00:00Z']) assert.equal(validDay(day), false);
  assert.equal(dateProblem('', { required: false }), '');
  assert(dateProblem('', { required: true }));
});

test('selection policies apply equally to calendar, keyboard and manually entered days', () => {
  const limits = { min: '2026-10-16', max: '2026-10-20', allowedDates: ['2026-10-16', '2026-10-20'] };
  assert.equal(dateProblem('2026-10-16', limits), '');
  for (const day of ['2026-10-15', '2026-10-17', '2026-10-21']) assert(dateProblem(day, limits));
  assert.equal(enabledDay('2026-10-17', 1, limits), '2026-10-20');
  assert.equal(enabledDay('2026-10-19', -1, limits), '2026-10-16');
  assert.equal(enabledDay('2026-10-21', 1, limits), undefined);
  assert(dateProblem('2026-10-15', { min: '2026-10-16' }));
  assert.equal(dateProblem('1995-11-22'), '', 'existing saved dates remain valid');
});

test('every calendar prevents new past selections while preserving stricter field restrictions', () => {
  for (const fieldLimits of [{}, { min: '1995-11-22' }, { allowedDates: ['2026-10-15', '2026-10-16', '2026-10-17'] }]) {
    const limits = selectionLimits(fieldLimits, '2026-10-16');
    assert(dateProblem('2026-10-15', limits), 'past day cannot be clicked or applied manually');
    assert.equal(dateProblem('2026-10-16', limits), '');
    assert.equal(enabledDay('2026-10-15', -1, limits), fieldLimits.allowedDates ? undefined : '2026-10-16');
  }
  assert.equal(selectionLimits({ min: '2026-10-17' }, '2026-10-16').min, '2026-10-17');
  assert(dateProblem('2026-10-16', selectionLimits({ max: '2026-10-15' }, '2026-10-16')));
});

test('month and year navigation handles leap years and December boundaries', () => {
  assert.equal(monthOffset('2028-01-31', 1), '2028-02-29');
  assert.equal(monthOffset('2027-01-31', 1), '2027-02-28');
  assert.equal(monthOffset('2026-12-16', 1), '2027-01-16');
  assert.equal(monthOffset('2028-02-29', -12), '2027-02-28');
  const grid = monthDays('2026-10');
  assert.equal(grid.length, 42);
  assert(grid.includes('2026-10-01'));
  assert(grid.includes('2026-10-31'));
  assert(monthDays('0001-01').includes('0001-01-01'));
  assert(monthDays('9999-12').includes('9999-12-31'));
});

test('general release edits accept historical dates; Coming soon publication requires a future day', () => {
  const draft = { title: 'Old film', synopsis: 'Story', genre: 'Drama', releaseDate: '1995-11-22', duration: 100, posterUrl: 'https://example.com/poster.jpg' };
  assert.equal(movieErrors(draft).releaseDate, undefined);
  assert(movieErrors(draft, { futureRelease: true }).releaseDate);
  assert(movieErrors({ ...draft, releaseDate: today() }, { futureRelease: true }).releaseDate);
  assert.equal(movieErrors({ ...draft, releaseDate: shiftDay(today(), 1) }, { futureRelease: true }).releaseDate, undefined);
  assert(movieErrors({ ...draft, releaseDate: '2026-02-31' }).releaseDate);
});
