import test from 'node:test';
import assert from 'node:assert/strict';
import { durationText, movieErrors } from './movieForm.js';

const good = {
  title: 'Toy Story', synopsis: 'Toys come alive.', genre: 'Animation', releaseDate: '2026-11-01',
  duration: 81, posterUrl: 'https://example.com/p.jpg', trailerUrl: '',
};

test('a complete movie has no errors', () => {
  assert.deepEqual(movieErrors(good), {});
  assert.deepEqual(movieErrors({ ...good, trailerUrl: 'https://www.youtube.com/watch?v=abc123' }), {});
});

test('every missing field is reported at once', () => {
  const errors = movieErrors({ title: ' ', synopsis: '', genre: '', releaseDate: '', duration: 0, posterUrl: '', trailerUrl: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['duration', 'genre', 'posterUrl', 'releaseDate', 'synopsis', 'title']);
});

test('the poster must be a link and the trailer a YouTube link', () => {
  assert.match(movieErrors({ ...good, posterUrl: 'poster.jpg' }).posterUrl, /not a link/);
  assert.match(movieErrors({ ...good, posterUrl: '/posters/p.jpg' }).posterUrl, /not a link/, 'the server only accepts full web links');
  assert.match(movieErrors({ ...good, trailerUrl: 'https://vimeo.com/1' }).trailerUrl, /YouTube/);
  assert.equal(movieErrors({ ...good, trailerUrl: '' }).trailerUrl, undefined, 'the trailer is optional');
});

test('the length must be a whole number of minutes', () => {
  assert.ok(movieErrors({ ...good, duration: '12.5' }).duration);
  assert.ok(movieErrors({ ...good, duration: -3 }).duration);
});

test('durations read as hours and minutes', () => {
  assert.equal(durationText(100), '1h 40m');
  assert.equal(durationText(45), '45m');
  assert.equal(durationText(''), '');
});
