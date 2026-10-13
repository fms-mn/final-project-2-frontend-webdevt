import test from 'node:test';
import assert from 'node:assert/strict';
import { trailerVideoId } from './trailer.js';

test('reads supported YouTube trailer links', () => {
  assert.equal(trailerVideoId({ trailerUrl: 'https://www.youtube.com/watch?v=c51ND9Hdbw0' }), 'c51ND9Hdbw0');
  assert.equal(trailerVideoId({ trailerUrl: 'https://youtu.be/c51ND9Hdbw0?t=4' }), 'c51ND9Hdbw0');
  assert.equal(trailerVideoId({ trailerUrl: 'https://www.youtube.com/embed/c51ND9Hdbw0' }), 'c51ND9Hdbw0');
  assert.equal(trailerVideoId({ trailerId: 'c51ND9Hdbw0' }), 'c51ND9Hdbw0');
});

test('missing and invalid trailer links remain unavailable', () => {
  assert.equal(trailerVideoId({}), '');
  assert.equal(trailerVideoId({ trailerUrl: 'https://example.com/watch?v=c51ND9Hdbw0' }), '');
  assert.equal(trailerVideoId({ trailerUrl: 'not a link' }), '');
});
