import test from 'node:test';
import assert from 'node:assert/strict';
import { previewMediaFor, previewLoopTarget, previewPlayerVars, previewVideoVisible, previewNeedsRestart } from './trailerPreview.js';
import { canHoverPreview } from '../hooks/useHoverPreview.js';

test('a YouTube trailer wins over a demo clip; no clip means no preview', () => {
  assert.deepEqual(previewMediaFor('c51ND9Hdbw0', { kind: 'video', src: '/a.mp4' }), { kind: 'youtube', videoId: 'c51ND9Hdbw0' });
  assert.deepEqual(previewMediaFor('', { kind: 'video', src: '/a.mp4' }), { kind: 'video', src: '/a.mp4' });
  assert.equal(previewMediaFor('', null), null);
  assert.equal(previewMediaFor('', { kind: 'video' }), null);
});

test('the preview player is silent and without controls', () => {
  const vars = previewPlayerVars('c51ND9Hdbw0', 'http://localhost:3000');
  assert.equal(vars.autoplay, 1);
  assert.equal(vars.mute, 1);
  assert.equal(vars.controls, 0);
  assert.equal(vars.start, 4);
  assert.ok(!('loop' in vars) && !('playlist' in vars), 'a playlist would add previous/next arrows and "More videos"');
  assert.equal(vars.origin, 'http://localhost:3000');
});

test('the video is shown only while it is playing, so no YouTube overlay is ever visible', () => {
  assert.equal(previewVideoVisible(1), true);
  for (const state of [-1, 0, 2, 3, 5]) assert.equal(previewVideoVisible(state), false, `state ${state}`);
  assert.equal(previewNeedsRestart(0), true);
  assert.equal(previewNeedsRestart(1), false);
});

test('hover previews run only with a real mouse, motion allowed, no data saver and a connection', () => {
  const win = ({ hover = true, reduced = false, saveData = false, onLine = true } = {}) => ({
    matchMedia: (query) => ({ matches: query.includes('prefers-reduced-motion') ? reduced : hover }),
    navigator: { connection: { saveData }, onLine },
  });
  assert.equal(canHoverPreview(win()), true);
  assert.equal(canHoverPreview(win({ hover: false })), false, 'touch screens');
  assert.equal(canHoverPreview(win({ reduced: true })), false);
  assert.equal(canHoverPreview(win({ saveData: true })), false);
  assert.equal(canHoverPreview(win({ onLine: false })), false, 'offline');
  assert.equal(canHoverPreview({ navigator: {} }), false, 'no matchMedia');
});

test('the trailer panel opens beside the card, on the side that has room', async () => {
  const { previewPlacement } = await import('./trailerPreview.js');
  const viewport = { width: 1400, height: 900 };
  const card = (left) => ({ left, right: left + 280, top: 300, height: 500, width: 280 });

  const right = previewPlacement(card(100), viewport, { width: 460, height: 390 });
  assert.equal(right.side, 'right');
  assert.equal(right.left, 100 + 280 + 16);

  const left = previewPlacement(card(1100), viewport, { width: 460, height: 390 });
  assert.equal(left.side, 'left', 'last column flips to the left');
  assert.equal(left.left, 1100 - 16 - 460);
});

test('the trailer panel stays on screen and falls back to covering the card on a narrow screen', async () => {
  const { previewPlacement } = await import('./trailerPreview.js');
  const high = previewPlacement({ left: 100, right: 380, top: -50, height: 500, width: 280 }, { width: 1400, height: 900 }, { width: 460, height: 390 });
  assert.equal(high.top, 8, 'never above the top of the screen');
  const low = previewPlacement({ left: 100, right: 380, top: 700, height: 500, width: 280 }, { width: 1400, height: 900 }, { width: 460, height: 390 });
  assert.equal(low.top, 900 - 8 - 390, 'never below the bottom');

  const phone = previewPlacement({ left: 20, right: 370, top: 100, height: 500, width: 350 }, { width: 390, height: 800 }, { width: 460, height: 300 });
  assert.equal(phone.side, 'over');
  assert.equal(phone.width, 390 - 16, 'shrinks to fit the screen');
  assert.ok(phone.left >= 8 && phone.left + phone.width <= 382);
});

test('the preview loops a short window by seeking back, and never reaches the end screen', () => {
  assert.equal(previewLoopTarget(10, 150), null, 'still inside the window');
  assert.equal(previewLoopTarget(32, 150), 4, 'window over: back to the start');
  assert.equal(previewLoopTarget(60, 150), 4);
  assert.equal(previewLoopTarget(21, 22), 4, 'a short trailer is cut 1.5 seconds before its end');
  assert.equal(previewLoopTarget(5.2, 6), 4, 'a tiny clip never gets stuck');
});

test('a finger that slides is scrolling, not holding', async () => {
  const { pressMoved } = await import('./trailerPreview.js');
  assert.equal(pressMoved({ x: 100, y: 100 }, { x: 104, y: 103 }), false, 'a little wobble is fine');
  assert.equal(pressMoved({ x: 100, y: 100 }, { x: 100, y: 125 }), true);
  assert.equal(pressMoved({ x: 100, y: 100 }, { x: 80, y: 100 }), true);
});

test('a peek is centred on the screen and fits a phone', async () => {
  const { peekPlacement } = await import('./trailerPreview.js');
  const phone = peekPlacement({ width: 390, height: 800 }, { width: 460, height: 380 });
  assert.equal(phone.width, 390 - 32);
  assert.equal(phone.left, 16);
  assert.equal(phone.top, (800 - 380) / 2);
  const tall = peekPlacement({ width: 390, height: 300 }, { width: 460, height: 380 });
  assert.equal(tall.top, 16, 'a short screen never pushes it above the top');
});
