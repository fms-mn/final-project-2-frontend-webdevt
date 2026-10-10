import test from 'node:test';
import assert from 'node:assert/strict';
import { previewMediaFor, youtubePreviewUrl } from './trailerPreview.js';
import { canHoverPreview } from '../hooks/useHoverPreview.js';

test('a YouTube trailer wins over a demo clip; no clip means no preview', () => {
  assert.deepEqual(previewMediaFor('c51ND9Hdbw0', { kind: 'video', src: '/a.mp4' }), { kind: 'youtube', videoId: 'c51ND9Hdbw0' });
  assert.deepEqual(previewMediaFor('', { kind: 'video', src: '/a.mp4' }), { kind: 'video', src: '/a.mp4' });
  assert.equal(previewMediaFor('', null), null);
  assert.equal(previewMediaFor('', { kind: 'video' }), null);
});

test('the preview embed is silent, looping and without controls', () => {
  const url = new URL(youtubePreviewUrl('c51ND9Hdbw0'));
  assert.equal(url.origin + url.pathname, 'https://www.youtube-nocookie.com/embed/c51ND9Hdbw0');
  assert.equal(url.searchParams.get('autoplay'), '1');
  assert.equal(url.searchParams.get('mute'), '1');
  assert.equal(url.searchParams.get('controls'), '0');
  assert.equal(url.searchParams.get('loop'), '1');
  assert.equal(url.searchParams.get('playlist'), 'c51ND9Hdbw0', 'a single video only loops with a playlist of itself');
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
