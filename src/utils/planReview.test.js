import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNextFree, clashWindow, describeClash, fixedSlot, occupied, pickRooms, pickTime, planCounts, skipAllClashes, slotKey, slotsToSave } from './planReview.js';

const at = (clock) => `2026-10-24T${clock}:00+08:00`;
const created = (clock, room = 'r1') => ({ movie: 'm1', auditorium: room, startTime: at(clock), endTime: at('23:00'), ticketPrice: 40000, published: true });
const clash = (clock, extra = {}) => ({
  kind: 'clash', movie: 'm1', auditorium: 'r1', ticketPrice: 40000, published: true, startTime: at(clock), label: clock, reason: 'busy',
  clash: { title: 'Quiet Film', startTime: at('13:30'), endTime: at('15:10') },
  fixes: { nextFree: at('15:25'), times: [at('15:25'), at('18:00')], rooms: [{ _id: 'r2', name: 'Auditorium 2' }] }, ...extra,
});
const result = () => ({
  createdCount: 2, created: [created('10:00'), created('17:30')],
  skipped: [clash('14:00'), clash('15:00', { fixes: { nextFree: null, rooms: [] } }), { kind: 'past', startTime: at('01:00'), label: 'old', reason: 'passed' }],
  skippedCount: 3,
});

test('counts: ready, undecided, fixed and skipped, with past times left out', () => {
  const r = result();
  assert.deepEqual(planCounts(r), { ready: 2, open: 2, fixed: 0, skipped: 1, total: 2 });
  const decisions = { [slotKey(r.skipped[0])]: { type: 'time', start: at('15:25') }, [slotKey(r.skipped[1])]: { type: 'skip' } };
  assert.deepEqual(planCounts(r, decisions), { ready: 2, open: 0, fixed: 1, skipped: 2, total: 3 });
});

test('a fix that collides counts as undecided again', () => {
  const r = result();
  const decision = { type: 'time', start: at('15:25') };
  const decisions = { [slotKey(r.skipped[0])]: decision };
  const collisions = new Set([slotKey(fixedSlot(r.skipped[0], decision))]);
  assert.equal(planCounts(r, decisions, collisions).open, 2);
  assert.equal(planCounts(r, decisions, collisions).fixed, 0);
});

test('saving lists ready showings and fixed ones, never skipped ones', () => {
  const r = result();
  const decisions = {
    [slotKey(r.skipped[0])]: { type: 'room', room: 'r2' },
    [slotKey(r.skipped[1])]: { type: 'skip' },
  };
  const slots = slotsToSave(r, decisions);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots.at(-1), { movie: 'm1', auditorium: 'r2', startTime: new Date(at('14:00')).toISOString(), ticketPrice: 40000, published: true });
  assert.equal(slotsToSave(r).length, 2, 'nothing decided yet: only the ready ones');
  const moved = slotsToSave(r, { [slotKey(r.skipped[0])]: { type: 'time', start: new Date(at('15:25')).toISOString() } });
  assert.equal(moved.at(-1).startTime, new Date(at('15:25')).toISOString());
  assert.equal(moved.at(-1).auditorium, 'r1');
});

test('bulk actions only touch what is still undecided', () => {
  const r = result();
  const next = applyNextFree(r, {}, { minutesOf: () => 81, gapMinutes: 15 });
  assert.equal(Object.keys(next).length, 1, 'the clash without a free time stays open');
  assert.equal(next[slotKey(r.skipped[0])].type, 'time');
  const kept = applyNextFree(r, { [slotKey(r.skipped[0])]: { type: 'skip' } });
  assert.equal(kept[slotKey(r.skipped[0])].type, 'skip', 'an earlier decision is kept');
  const skipped = skipAllClashes(r, next);
  assert.equal(skipped[slotKey(r.skipped[0])].type, 'time');
  assert.equal(skipped[slotKey(r.skipped[1])].type, 'skip');
});

test('the reason is written in plain words for each kind of clash', () => {
  const words = { roomName: 'Auditorium 1', movieTitle: 'Toy Story', movieMinutes: 81, gapMinutes: 15 };
  assert.match(describeClash(clash('14:00'), words), /would overlap Quiet Film \(1:30 PM to 3:10 PM\)/);
  assert.match(describeClash(clash('15:20'), words), /Quiet Film runs until 3:10 PM and the room needs 15 minutes to reset, so Toy Story at 3:20 PM would start 5 minutes too early/);
  assert.match(describeClash(clash('12:00'), words), /would end 6 minutes too close to Quiet Film/);
  assert.equal(describeClash({ reason: 'just this', startTime: at('10:00') }, words), 'just this');
});

test('the drawn window pads an hour either side and follows a moved start', () => {
  const item = clash('14:00');
  assert.deepEqual(clashWindow(item, 81), { from: 720, to: 1020, existing: [810, 910], proposed: [840, 921] });
  const moved = clashWindow(item, 81, at('15:25'));
  assert.deepEqual(moved.proposed, [925, 1006]);
});

test('two clashes never take the same free time', () => {
  const r = {
    createdCount: 0, created: [], skippedCount: 2,
    skipped: [clash('14:00'), clash('14:30')],
  };
  const words = { minutesOf: () => 81, gapMinutes: 15 };
  const next = applyNextFree(r, {}, words);
  const starts = r.skipped.map((item) => next[slotKey(item)].start);
  assert.equal(starts[0], new Date(at('15:25')).toISOString());
  assert.equal(starts[1], new Date(at('18:00')).toISOString(), 'the second one takes the next window');

  const taken = occupied(r, { [slotKey(r.skipped[0])]: { type: 'time', start: starts[0] } }, () => 81);
  assert.equal(pickTime(r.skipped[1], taken, { minutes: 81, gapMinutes: 15 }), new Date(at('18:00')).toISOString());
  assert.equal(pickTime(r.skipped[0], taken, { minutes: 81, gapMinutes: 15 }), new Date(at('15:25')).toISOString(), 'a clash is not blocked by its own fix');
});

test('a room already filled by another fix at that time is not offered', () => {
  const r = { createdCount: 0, created: [], skippedCount: 2, skipped: [clash('14:00'), clash('14:30')] };
  const taken = occupied(r, { [slotKey(r.skipped[0])]: { type: 'room', room: 'r2' } }, () => 81);
  assert.deepEqual(pickRooms(r.skipped[1], taken, { minutes: 81, gapMinutes: 15 }), []);
  assert.equal(pickRooms(r.skipped[0], taken, { minutes: 81, gapMinutes: 15 }).length, 1);
});
