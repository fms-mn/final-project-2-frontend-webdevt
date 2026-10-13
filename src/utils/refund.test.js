import test from 'node:test';
import assert from 'node:assert/strict';
import { refundSummary } from './refund.js';
const info = { eligible: true, paymentStatus: 'paid', refund: { status: 'available', mode: 'simulated', amount: 80050 } };

test('preview and recorded refunds show backend centavos precisely', () => {
  assert.match(refundSummary(info).message, /₱800.5/);
  assert.match(refundSummary(info).message, /will be recorded/);
  const result = refundSummary({ ...info, refund: { ...info.refund, status: 'refunded', reference: 'RF-123' } }, true);
  assert.match(result.message, /was recorded/);
  assert.match(result.message, /No real money/);
  assert.equal(result.reference, 'RF-123');
});
test('unknown information is distinct from no refund and does not promise success', () => {
  for (const value of [null, {}, { ...info, refund: { ...info.refund, amount: null } }, { ...info, refund: { ...info.refund, mode: null } }]) assert.equal(refundSummary(value).unavailable, true);
  assert.equal(refundSummary(info, true).unavailable, true, 'available preview is not a completed refund');
  const none = refundSummary({ paymentStatus: 'unpaid', refund: { status: 'none' } });
  assert.equal(none.title, 'No refund');
  assert.equal(none.unavailable, false);
});
test('already refunded, non-refundable, pending and failed outcomes are explicit', () => {
  assert.match(refundSummary({ ...info, refund: { ...info.refund, status: 'refunded' } }).message, /No additional refund/);
  assert.match(refundSummary({ refund: { status: 'non_refundable', reason: 'The showing started.' } }).message, /showing started/);
  for (const status of ['pending', 'failed']) {
    const result = refundSummary({ refund: { status } }, true);
    assert.match(result.message, /Cancellation is complete/);
    assert.match(result.message, /do not cancel again/);
    assert.doesNotMatch(result.title, /successful/);
  }
});
