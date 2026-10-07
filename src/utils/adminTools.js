// Small helpers for the admin screens.

// The server keeps money as whole centavos; this shows pesos.
export const pesos = (centavos) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2,
}).format((Number(centavos) || 0) / 100);

// Percent change against the previous period; null when there is nothing to compare with.
export function trend(now, before) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

// A spreadsheet runs text that starts with = + - or @ as a formula, so those cells get a
// leading quote. Quotes inside a cell are doubled.
export function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export const toCsv = (rows) => `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;

// At most `limit` labels, evenly spread, so a 90-day chart stays readable.
export function sparseLabels(labels, limit = 8) {
  if (labels.length <= limit) return labels.map((label) => label);
  const step = (labels.length - 1) / (limit - 1);
  const keep = new Set(Array.from({ length: limit }, (_, index) => Math.round(index * step)));
  return labels.map((label, index) => (keep.has(index) ? label : ''));
}

// Server validation messages arrive as { message, errors: { field: text } }.
export const describeError = (error) => {
  const details = error.errors ? Object.values(error.errors).join(' ') : '';
  return details ? `${error.message} ${details}` : error.message || 'Something went wrong';
};

// "10:00, 13:30 18:00" -> ['10:00', '13:30', '18:00']; null when any part is not a clock time.
export function parseTimes(text) {
  const parts = String(text).split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const times = [];
  for (const part of parts) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(part);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    times.push(`${match[1].padStart(2, '0')}:${match[2]}`);
  }
  return [...new Set(times)].sort();
}
