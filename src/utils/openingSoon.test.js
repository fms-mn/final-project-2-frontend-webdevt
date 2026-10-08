import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarReminder, daysUntilOpening, openingDate } from './openingSoon.js';

test('opening dates and countdowns use Manila calendar days', () => {
  assert.equal(openingDate({ releaseDate: '2026-11-06T18:00:00Z' }), '2026-11-07');
  assert.equal(openingDate({ releaseDate: 'invalid' }), null);
  assert.equal(daysUntilOpening('2026-11-07', '2026-10-08'), 30);
});

test('calendar reminder includes the exact release day and an alarm', () => {
  const reminder = calendarReminder({ _id: 'movie-1', title: 'The Tide, Again' }, '2026-12-07', new Date('2026-10-08T00:00:00Z'));
  assert.match(reminder, /DTSTART;VALUE=DATE:20261207/);
  assert.match(reminder, /DTEND;VALUE=DATE:20261208/);
  assert.match(reminder, /TRIGGER:-P1D/);
  assert.match(reminder, /SUMMARY:The Tide\\, Again opens at FILME/);
});
