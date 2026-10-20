import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_CHOICES, MAX_DAYS, defaultRoomId, defaultStartDay, defaultTimes, describeRange, describeSetup, listTimes, recallSetup, rememberSetup, validDayCount } from './setupDefaults.js';

const rooms = [
  { _id: 'a', name: 'Auditorium 1', rows: 4, seatsPerRow: 8, isActive: true },
  { _id: 'b', name: 'Auditorium 2', rows: 10, seatsPerRow: 12, isActive: true },
  { _id: 'c', name: 'Closed', rows: 20, seatsPerRow: 20, isActive: false },
];

test('the room is the one used last, or else the biggest active one', () => {
  assert.equal(defaultRoomId(rooms), 'b');
  assert.equal(defaultRoomId(rooms, 'a'), 'a');
  assert.equal(defaultRoomId(rooms, 'c'), 'b', 'an inactive room is never chosen');
  assert.equal(defaultRoomId([]), '');
  assert.equal(defaultRoomId([rooms[2]]), '');
});

test('a movie opening later starts on its release day, a released one tomorrow', () => {
  assert.equal(defaultStartDay('2026-10-24', '2026-10-17'), '2026-10-24');
  assert.equal(defaultStartDay('2026-10-10', '2026-10-17'), '2026-10-18');
  assert.equal(defaultStartDay('2026-10-17', '2026-10-17'), '2026-10-18');
});

test('the usual times drop any that would start before the previous movie is over', () => {
  assert.deepEqual(defaultTimes(120, 15), ['10:00', '13:00', '16:00', '19:00', '21:30']);
  assert.deepEqual(defaultTimes(180, 15), ['10:00', '16:00', '21:30']);
  assert.deepEqual(defaultTimes(1200, 15), ['10:00'], 'a very long movie still gets one time');
  assert.deepEqual(defaultTimes(undefined), ['10:00', '13:00', '16:00', '19:00', '21:30']);
});

test('times and the sentence are written for people', () => {
  assert.equal(listTimes(['16:00', '10:00', '13:00']), '10:00 AM, 1:00 PM and 4:00 PM');
  assert.equal(listTimes(['10:00']), '10:00 AM');
  assert.equal(listTimes([]), '');
  assert.equal(
    describeSetup({ roomName: 'Auditorium 1', days: 7, startDay: '2026-10-24', times: ['10:00', '13:00'], price: '400' }),
    'In Auditorium 1, for 7 days from Sat, Oct 24, at 10:00 AM and 1:00 PM, ₱400 a seat.',
  );
  assert.match(describeSetup({ roomName: 'A', days: 1, startDay: '2026-10-24', times: ['10:00'], price: '350.5' }), /on Sat, Oct 24, at 10:00 AM, ₱350\.50 a seat/);
});

test('without any start time the sentence says what is missing instead of "at no times"', () => {
  const sentence = describeSetup({ roomName: 'Auditorium 5', days: 1, startDay: '2026-12-16', times: [], price: '400' });
  assert.equal(sentence, 'In Auditorium 5, on Wed, Dec 16: choose at least one start time, ₱400 a seat.');
  assert.doesNotMatch(sentence, /no times/);
  assert.match(describeSetup({ roomName: 'A', days: NaN, startDay: '2026-12-16', times: ['10:00'], price: '400' }), /from Wed, Dec 16, at 10:00 AM/);
});

test('the day choices include a custom length, and the range names the first and last day', () => {
  assert.deepEqual(DAY_CHOICES.map(([count]) => count), [1, 3, 7, 14]);
  assert.equal(MAX_DAYS, 31, 'the server schedules at most 31 days at a time');
  assert.equal(validDayCount(1) && validDayCount(31) && validDayCount(10), true);
  assert.equal([0, 32, 2.5, NaN, '5', null].some(validDayCount), false);
  assert.equal(describeRange('2026-12-16', 1), 'Wed, Dec 16 · 1 day');
  assert.equal(describeRange('2026-12-16', 7), 'Wed, Dec 16 – Tue, Dec 22 · 7 days');
  assert.equal(describeRange('2026-12-30', 5), 'Wed, Dec 30 – Sun, Jan 3 · 5 days', 'a range can cross a month');
  assert.equal(describeRange('2026-12-16', 0), '');
  assert.equal(describeRange('', 3), '');
});

test('remembered choices survive, and a browser without storage just gets nothing', () => {
  assert.deepEqual(recallSetup(), { room: '', times: null, price: '', days: null });
  assert.doesNotThrow(() => rememberSetup({ room: 'a', times: ['10:00'], price: '400', days: 7 }));
  const store = new Map();
  globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  try {
    rememberSetup({ room: 'a', times: ['10:00', '19:00'], price: '450', days: 3 });
    assert.deepEqual(recallSetup(), { room: 'a', times: ['10:00', '19:00'], price: '450', days: 3 });
    store.set('filme.setupPrefs', JSON.stringify({ room: 5, times: ['bad'], price: '', days: 99 }));
    assert.deepEqual(recallSetup(), { room: '', times: null, price: '', days: null }, 'junk is ignored');
    rememberSetup({ room: 'a', times: ['10:00'], price: '400', days: 10 });
    assert.equal(recallSetup().days, 10, 'a custom number of days is remembered too');
    store.set('filme.setupPrefs', JSON.stringify({ room: 'a', times: null, price: '', days: 32 }));
    assert.equal(recallSetup().days, null, 'more than the server allows is ignored');
    store.set('filme.setupPrefs', '{not json');
    assert.deepEqual(recallSetup(), { room: '', times: null, price: '', days: null });
  } finally { delete globalThis.localStorage; }
});
