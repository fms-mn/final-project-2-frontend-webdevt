import test from 'node:test';
import assert from 'node:assert/strict';
import { canAutoplayTrailer } from './trailer.js';

const fakeWindow = ({ reduceMotion = false, saveData } = {}) => ({
  matchMedia: (query) => ({ matches: reduceMotion && query.includes('prefers-reduced-motion') }),
  navigator: saveData === undefined ? {} : { connection: { saveData } },
});

test('autoplay is allowed by default', () => {
  assert.equal(canAutoplayTrailer(fakeWindow()), true);
  assert.equal(canAutoplayTrailer(fakeWindow({ saveData: false })), true);
});

test('autoplay is skipped for people who prefer reduced motion', () => {
  assert.equal(canAutoplayTrailer(fakeWindow({ reduceMotion: true })), false);
});

test('autoplay is skipped when the browser asks to save data', () => {
  assert.equal(canAutoplayTrailer(fakeWindow({ saveData: true })), false);
});

test('autoplay is skipped when there is no browser window, or it misbehaves', () => {
  assert.equal(canAutoplayTrailer(undefined), false);
  assert.equal(canAutoplayTrailer({ matchMedia: () => { throw new Error('boom'); } }), false);
});
