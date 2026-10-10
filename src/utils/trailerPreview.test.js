import test from 'node:test';
import assert from 'node:assert/strict';
import { previewMediaFor, youtubePreviewUrl } from './trailerPreview.js';
import { canHoverPreview } from '../hooks/useHoverPreview.js';

test('a YouTube trailer wins over a demo clip; no clip means no preview', () => {
  assert.deepEqual(previewMediaFor('c51ND9Hdbw0', { kind: 'video', src: '/a.mp4' }), { kind: 'youtube', videoId: 'c51ND9Hdbw0' });
  assert.deepEqual(previewMediaFor('', { kind: 'video', src: '/a.mp4' }), { kind: 'video', src: '/a.mp4', label: 'Sample footage · not a movie trailer' });
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
