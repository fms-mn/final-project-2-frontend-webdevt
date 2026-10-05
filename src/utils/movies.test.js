import test from 'node:test';
import assert from 'node:assert/strict';
import { isReleased, normalizeMovie } from './movies.js';
import { DEMO_TICKET_PRICE } from '../constants/pricing.js';

const apiMovie = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Dune: Part Three',
  synopsis: 'Paul unites the Fremen.',
  genre: 'Sci-Fi',
  rating: 'PG-13',
  posterUrl: 'https://example.com/p.jpg',
  duration: 166,
  releaseDate: '2026-11-15T00:00:00.000Z',
  status: 'published',
};

test('a movie is released once its release date has passed', () => {
  assert.equal(isReleased(apiMovie, new Date('2026-11-15T00:00:00Z')), true);
  assert.equal(isReleased(apiMovie, new Date('2026-12-01T00:00:00Z')), true);
  assert.equal(isReleased(apiMovie, new Date('2026-11-14T23:59:59Z')), false);
});

test('normalizeMovie gives the pages the shape they expect', () => {
  const movie = normalizeMovie(apiMovie, new Date('2026-12-01T00:00:00Z'));
  assert.equal(movie._id, apiMovie._id);
  assert.equal(movie.title, 'Dune: Part Three');
  assert.equal(movie.description, 'Paul unites the Fremen.');
  assert.deepEqual(movie.genre, ['Sci-Fi']);
  assert.equal(movie.status, 'now_showing');
  assert.equal(movie.price, DEMO_TICKET_PRICE);
  assert.equal(movie.releaseDate, apiMovie.releaseDate);
});

test('an unreleased movie is "coming soon"; a bad date never counts as released', () => {
  assert.equal(normalizeMovie(apiMovie, new Date('2026-10-05T00:00:00Z')).status, 'coming_soon');
  assert.equal(normalizeMovie({ ...apiMovie, releaseDate: 'not a date' }).status, 'coming_soon');
});

test('a movie without a genre still works', () => {
  assert.deepEqual(normalizeMovie({ ...apiMovie, genre: undefined }).genre, []);
});
