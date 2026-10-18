import test from 'node:test';
import assert from 'node:assert/strict';
import { copyOccupied, copyOutcome, refreshCopyPlan, suggestCopyFixes } from './copyDay.js';
import { planCounts, slotKey, slotsToSave } from './planReview.js';

const at = (time, day = '24') => `2026-10-${day}T${time}:00+08:00`;
const slot = (time, day) => ({ movie: 'm', auditorium: 'r', startTime: at(time, day), ticketPrice: 40000, published: false });
const conflict = (time, day) => ({ ...slot(time, day), kind: 'clash', fixes: { times: [at('14:15', day), at('18:00', day)], rooms: [] } });
const plan = (created = [], skipped = []) => ({ requested: created.length + skipped.length, createdCount: created.length, created, skipped });
const rules = { minutesOf: () => 120, gapMinutes: 15 };

test('copy suggestions include runtime and turnaround of ready copies and other suggestions', () => {
  const a = conflict('12:00'); const b = conflict('12:30');
  const result = plan([slot('14:00')], [a, b]);
  const next = suggestCopyFixes(result, {}, rules);
  assert.equal(next[slotKey(a)].start, new Date(at('18:00')).toISOString());
  assert.equal(next[slotKey(b)], undefined, 'no overlapping suggestion is offered');
  assert.equal(copyOccupied(result, next, rules.minutesOf).length, 2);
  assert.deepEqual(result.created, [slot('14:00')], 'preview never mutates the source plan');
});

test('multiple destination days remain independent; existing skip choices are preserved', () => {
  const a = conflict('12:00', '24'); const b = conflict('12:00', '25'); const c = conflict('12:30', '25');
  const result = plan([], [a, b, c]);
  const next = suggestCopyFixes(result, { [slotKey(c)]: { type: 'skip' } }, rules);
  assert.equal(planCounts(result, next).total, 2);
  assert.equal(planCounts(result, next).skipped, 1);
  assert.equal(slotsToSave(result, next).length, 2);
  assert.equal(slotsToSave(result, next)[0].published, false);
});

test('new conflicts reopen only affected ready copies and resolution choices', () => {
  const a = conflict('12:00'); const b = conflict('12:30'); const ready = slot('10:00');
  const result = plan([ready], [a, b]);
  const decisions = { [slotKey(a)]: { type: 'time', start: at('18:00') }, [slotKey(b)]: { type: 'skip' } };
  const failed = { ...slot('18:00'), kind: 'clash', reason: 'Another showing was added', fixes: { times: [at('21:00')] } };
  const refreshed = refreshCopyPlan(result, decisions, plan([ready], [failed]));
  assert.equal(refreshed.decisions[slotKey(a)], undefined);
  assert.equal(refreshed.decisions[slotKey(b)].type, 'skip');
  assert.equal(planCounts(refreshed.result, refreshed.decisions).open, 1);
  assert.equal(refreshed.result.skipped[0].startTime, at('18:00'));
  assert.equal(refreshed.result.requested, 3);
  assert.equal(result.skipped[0], a, 'original snapshot remains intact');
});

test('a formerly ready copy becoming unavailable is retained with its reason', () => {
  const ready = slot('10:00');
  const failure = { ...ready, kind: 'unavailable', reason: 'Auditorium is inactive' };
  const refreshed = refreshCopyPlan(plan([ready]), {}, plan([], [failure]));
  assert.equal(planCounts(refreshed.result).total, 0);
  assert.equal(refreshed.result.skipped[0].reason, failure.reason);
});

test('all conflicts can be skipped and undone without an empty save', () => {
  const item = conflict('12:00'); const result = plan([], [item]);
  assert.equal(planCounts(result).open, 1);
  assert.equal(planCounts(result, { [slotKey(item)]: { type: 'skip' } }).total, 0);
  assert.equal(slotsToSave(result, { [slotKey(item)]: { type: 'skip' } }).length, 0);
  assert.equal(planCounts(result, {}).open, 1);
});

test('save outcome reports actual created, skipped and failed counts', () => {
  assert.deepEqual(copyOutcome({ created: [slot('10:00')] }, 3, 2), { created: 1, skipped: 2, failed: 2, complete: false });
  assert.deepEqual(copyOutcome({ created: [slot('10:00')] }, 1, 0), { created: 1, skipped: 0, failed: 0, complete: true });
});
