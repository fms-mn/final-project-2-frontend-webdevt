import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardBrandOf, cardErrors, describePayment, formatCardNumber, formatCountdown, formatExpiry, mobileError,
  passesLuhn, paymentLine, secondsLeft, paymentModeOf, isTestBooking,
} from './payment.js';

test('card numbers are grouped as they are typed and brands are recognised', () => {
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
  assert.equal(formatCardNumber('4242-4242 42'), '4242 4242 42');
  assert.equal(formatCardNumber('378282246310005'), '3782 822463 10005', 'American Express groups 4-6-5');
  assert.equal(formatCardNumber('abc'), '');
  assert.equal(cardBrandOf('4242 4242'), 'Visa');
  assert.equal(cardBrandOf('5555 5555'), 'Mastercard');
  assert.equal(cardBrandOf('2223 0000'), 'Mastercard');
  assert.equal(cardBrandOf('3782 8224'), 'American Express');
  assert.equal(cardBrandOf('9999'), '');
});

test('the expiry date gets its slash by itself, and can still be deleted', () => {
  assert.equal(formatExpiry('1'), '1');
  assert.equal(formatExpiry('5'), '05/', 'a month after 1 needs a leading zero');
  assert.equal(formatExpiry('12'), '12/');
  assert.equal(formatExpiry('1230'), '12/30');
  assert.equal(formatExpiry('12/', '12/3'), '12', 'backspacing past the slash works');
  assert.equal(formatExpiry('12/3'), '12/3');
});

test('card checks catch a typo, an old card and a short security code', () => {
  const now = new Date('2026-10-10T00:00:00Z');
  const ok = { number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' };
  assert.deepEqual(cardErrors(ok, now), {});
  assert.ok(cardErrors({ ...ok, number: '4242 4242 4242 4241' }, now).number);
  assert.ok(cardErrors({ ...ok, number: '' }, now).number);
  assert.ok(cardErrors({ ...ok, expiry: '09/26' }, now).expiry, 'expired last month');
  assert.deepEqual(cardErrors({ ...ok, expiry: '10/26' }, now), {}, 'this month is still valid');
  assert.ok(cardErrors({ ...ok, expiry: '13/30' }, now).expiry);
  assert.ok(cardErrors({ ...ok, expiry: '1/30' }, now).expiry);
  assert.ok(cardErrors({ ...ok, cvc: '12' }, now).cvc);
  assert.ok(cardErrors({ ...ok, cvc: '12a' }, now).cvc);
  assert.deepEqual(cardErrors({ number: '3782 822463 10005', expiry: '12/30', cvc: '1234' }, now), {});
  assert.ok(cardErrors({ number: '3782 822463 10005', expiry: '12/30', cvc: '123' }, now).cvc, 'Amex needs four digits');
  assert.equal(passesLuhn('4000000000000002'), true);
});

test('mobile numbers accept the usual Philippine forms', () => {
  for (const good of ['09171234567', '0917 123 4567', '+639171234567', '639171234567']) assert.equal(mobileError(good), '', good);
  for (const bad of ['', '12345', '08171234567', '0917123456', 'abc']) assert.ok(mobileError(bad), bad);
});

test('the hold countdown never goes below zero and reads as minutes and seconds', () => {
  const end = '2026-10-10T10:05:00Z';
  const at = (iso) => Date.parse(iso);
  assert.equal(secondsLeft(end, at('2026-10-10T10:00:00Z')), 300);
  assert.equal(secondsLeft(end, at('2026-10-10T10:04:59.100Z')), 1, 'a part second counts as a second');
  assert.equal(secondsLeft(end, at('2026-10-10T10:05:00Z')), 0);
  assert.equal(secondsLeft(end, at('2026-10-10T11:00:00Z')), 0);
  assert.equal(secondsLeft(undefined), 0);
  assert.equal(formatCountdown(300), '5:00');
  assert.equal(formatCountdown(65), '1:05');
  assert.equal(formatCountdown(9), '0:09');
  assert.equal(formatCountdown(-4), '0:00');
});

test('a payment reads the way a receipt would', () => {
  const card = { mode: 'simulated', method: 'card', cardBrand: 'Visa', cardLast4: '4242', status: 'paid', reference: 'PAY-AAAA1111' };
  assert.equal(describePayment(card), 'Visa •••• 4242');
  assert.equal(describePayment({ method: 'gcash', walletLast4: '4567' }), 'GCash •••• 4567');
  assert.equal(describePayment({ method: 'maya', walletLast4: '0001' }), 'Maya •••• 0001');
  assert.equal(describePayment(null), '');
  assert.equal(paymentLine({ payment: card, paymentStatus: 'paid' }), 'Test payment successful · No real money was charged · Visa •••• 4242');
  assert.equal(paymentLine({ payment: { ...card, status: 'refunded', refundReference: 'RF-ZZ99' }, paymentStatus: 'refunded' }), 'Test refund · RF-ZZ99');
  assert.equal(paymentLine({ payment: null, paymentStatus: 'paid' }), '', 'an older booking has no payment record');
  assert.equal(paymentLine({ payment: { ...card, status: 'failed' }, paymentStatus: 'unpaid' }), '');
});

test('the admin sees at a glance whether a booking is paid, refunded or still waiting', async () => {
  const { paymentSummary } = await import('./payment.js');
  const card = { mode: 'simulated', method: 'card', cardBrand: 'Visa', cardLast4: '4242' };
  assert.deepEqual(paymentSummary({ paymentStatus: 'paid', payment: card }), { label: 'Test paid', text: 'Visa •••• 4242', tone: 'paid' });
  assert.equal(paymentSummary({ paymentStatus: 'paid', payment: null }).label, 'Unverified', 'an older booking without mode metadata');
  assert.deepEqual(paymentSummary({ paymentStatus: 'refunded', payment: card }), { label: 'Test refund', text: 'Visa •••• 4242', tone: 'refunded' });
  assert.equal(paymentSummary({ paymentStatus: 'unpaid', status: 'pending' }).label, 'Awaiting');
  assert.equal(paymentSummary({ paymentStatus: 'unpaid', status: 'expired' }).label, 'Not paid');
  assert.equal(paymentSummary({ paymentStatus: null, status: 'cancelled' }).label, '—');
});

test('a refunded ticket reports what came back, an unpaid or demo one reports nothing', async () => {
  const { refundOf } = await import('./payment.js');
  assert.deepEqual(refundOf({ payment: { status: 'refunded', amount: 80000, refundReference: 'RF-AB12CD34' } }), { amount: 800, reference: 'RF-AB12CD34' });
  assert.equal(refundOf({ payment: { status: 'paid', amount: 80000 } }), null);
  assert.equal(refundOf({ payment: null }), null);
  assert.equal(refundOf(undefined), null);
});

test('simulation mode comes from provider metadata, independently of the account', () => {
  assert.equal(paymentModeOf({ paymentMode: 'simulated' }), 'simulated');
  assert.equal(isTestBooking({ paymentMode: 'simulated' }), true);
  assert.equal(paymentModeOf({ payment: { mode: 'simulated' } }), 'simulated');
  assert.equal(paymentModeOf({ isDemo: true }), null, 'an account flag cannot verify a payment provider');
  assert.equal(paymentModeOf({}), null);
  assert.equal(isTestBooking({ paymentMode: 'live' }), false);
  assert.match(paymentLine({ payment: { method: 'card', status: 'paid' } }), /Payment mode unverified/);
});
