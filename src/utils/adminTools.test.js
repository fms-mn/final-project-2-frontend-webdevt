import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, describeError, pesos, sparseLabels, toCsv, trend } from './adminTools.js';

test('pesos shows whole pesos plainly and centavos only when there are some', () => {
  assert.equal(pesos(40000), '₱400');
  assert.equal(pesos(40050), '₱400.50');
  assert.equal(pesos(0), '₱0');
  assert.equal(pesos(undefined), '₱0');
});

test('trend is the percent change, or null with no earlier figure', () => {
  assert.equal(trend(150, 100), 50);
  assert.equal(trend(50, 100), -50);
  assert.equal(trend(0, 100), -100);
  assert.equal(trend(10, 0), null);
});

test('csv cells are quoted and cannot start a spreadsheet formula', () => {
  assert.equal(csvCell('plain'), '"plain"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=SUM(A1:A9)'), '"\'=SUM(A1:A9)"');
  assert.equal(csvCell('+1'), '"\'+1"');
  assert.equal(csvCell('@home'), '"\'@home"');
  assert.equal(csvCell(null), '""');
  assert.equal(toCsv([['a', 'b'], [1, '=x']]), '﻿"a","b"\r\n"1","\'=x"');
});

test('a long chart keeps the first and last label and blanks the rest', () => {
  const labels = Array.from({ length: 30 }, (_, i) => `d${i}`);
  const sparse = sparseLabels(labels, 6);
  assert.equal(sparse.length, 30);
  assert.equal(sparse[0], 'd0');
  assert.equal(sparse[29], 'd29');
  assert.equal(sparse.filter(Boolean).length, 6);
  assert.deepEqual(sparseLabels(['a', 'b'], 6), ['a', 'b']);
});

test('server validation errors are joined into one readable message', () => {
  assert.equal(describeError({ message: 'Validation failed', errors: { title: 'Required', genre: 'Too long.' } }), 'Validation failed Required Too long.');
  assert.equal(describeError({ message: 'Nope' }), 'Nope');
  assert.equal(describeError({}), 'Something went wrong');
});
