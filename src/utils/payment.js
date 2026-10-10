// Small helpers for the payment step: typing a card, the hold countdown, and how a payment reads.

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

export function cardBrandOf(number) {
  const digits = digitsOnly(number);
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  return '';
}

// "4242424242424242" -> "4242 4242 4242 4242" (American Express groups as 4-6-5).
export function formatCardNumber(value) {
  const digits = digitsOnly(value).slice(0, 19);
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// "1230" -> "12/30", and a single "5" becomes "05/" so the month is always two digits.
export function formatExpiry(value, previous = '') {
  let digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  const deleting = String(value ?? '').length < previous.length;
  if (digits.length === 2 && !deleting) return `${digits}/`;
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function passesLuhn(number) {
  const digits = digitsOnly(number);
  if (digits.length < 13) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Quick checks before anything is sent, so a typo is caught on the spot. The server checks again.
export function cardErrors({ number, expiry, cvc }, now = new Date()) {
  const errors = {};
  if (!passesLuhn(number) || digitsOnly(number).length > 19) errors.number = 'That card number is not valid';
  const match = String(expiry ?? '').match(/^(\d{2})\/(\d{2})$/);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) errors.expiry = 'Enter the expiry date as MM/YY';
  else if (new Date(Date.UTC(2000 + Number(match[2]), Number(match[1]), 1)) <= now) errors.expiry = 'That card has expired';
  const length = cardBrandOf(number) === 'American Express' ? 4 : 3;
  if (digitsOnly(cvc).length !== length || String(cvc).trim() !== digitsOnly(cvc)) errors.cvc = `Enter the ${length}-digit security code`;
  return errors;
}

export function mobileError(mobile) {
  return /^(?:\+?63|0)9\d{9}$/.test(String(mobile ?? '').replace(/[\s-]/g, '')) ? '' : 'Enter a mobile number like 09171234567';
}

// ---- the hold countdown --------------------------------------------------------------------
export function secondsLeft(holdExpiresAt, now = Date.now()) {
  const end = new Date(holdExpiresAt).getTime();
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : 0;
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

// ---- how a payment reads -------------------------------------------------------------------
const METHOD_NAMES = { card: 'Card', gcash: 'GCash', maya: 'Maya' };
export const methodName = (method) => METHOD_NAMES[method] || 'Payment';

// "Visa •••• 4242", "GCash •••• 4567"
export function describePayment(payment) {
  if (!payment) return '';
  if (payment.method === 'card') return `${payment.cardBrand || 'Card'} •••• ${payment.cardLast4 || ''}`.trim();
  return `${methodName(payment.method)} •••• ${payment.walletLast4 || ''}`.trim();
}

// The line under a ticket: "Paid · Visa •••• 4242" or "Refunded · RF-AB12CD34".
export function paymentLine(booking) {
  if (!booking?.payment) return '';
  const { payment } = booking;
  if (booking.paymentStatus === 'refunded' || payment.status === 'refunded') {
    return `Refunded${payment.refundReference ? ` · ${payment.refundReference}` : ''}`;
  }
  return payment.status === 'paid' ? `Paid · ${describePayment(payment)}` : '';
}

// The Payment column of the admin's bookings table.
export function paymentSummary(booking) {
  const method = describePayment(booking?.payment);
  switch (booking?.paymentStatus) {
    case 'paid': return { label: 'Paid', text: method || 'Before online payments', tone: 'paid' };
    case 'refunded': return { label: 'Refunded', text: method, tone: 'refunded' };
    case 'unpaid':
      return booking.status === 'pending'
        ? { label: 'Awaiting', text: '', tone: 'waiting' }
        : { label: 'Not paid', text: '', tone: 'none' };
    default: return { label: '—', text: '', tone: 'none' };
  }
}
