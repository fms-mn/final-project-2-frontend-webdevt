import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SEATS_PER_BOOKING, toggleSeatSelection } from './seatSelection.js';
import { createDemoBooking } from '../data/demoBookings.js';

test('seat selection accepts ten, rejects eleven, and allows swapping at the limit', () => {
  let selected = [];
  for (let i = 1; i <= MAX_SEATS_PER_BOOKING; i++) selected = toggleSeatSelection(selected, `A${i}`, []);
  assert.equal(selected.length, 10);
  assert.equal(toggleSeatSelection(selected, 'B1', []), selected);
  selected = toggleSeatSelection(selected, 'A1', []);
  selected = toggleSeatSelection(selected, 'B1', []);
  assert.equal(selected.length, 10);
  assert.ok(selected.includes('B1') && !selected.includes('A1'));
  assert.equal(toggleSeatSelection(selected, 'B2', ['B2']), selected);
});

test('demo booking rejects more than ten seats before persisting', () => {
  assert.throws(() => createDemoBooking({ userId: 'demo-user', movie: { _id: 'fixture', status: 'now_showing' }, seats: [...Array.from({ length: 10 }, (_, i) => `A${i + 1}`), 'B1'] }), /at most 10 seats/);
});
