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

test('the server\'s showing status and cheapest price win over the release date', () => {
  const live = { ...apiMovie, releaseDate: '2020-01-01T00:00:00.000Z', showStatus: 'now_showing', fromPrice: 35050 };
  assert.equal(normalizeMovie(live).status, 'now_showing');
  assert.equal(normalizeMovie(live).price, 350.5, 'centavos become pesos');
  assert.equal(normalizeMovie({ ...live, showStatus: 'not_showing', fromPrice: null }).status, 'not_showing', 'released but nothing to book');
  assert.equal(normalizeMovie({ ...live, showStatus: 'not_showing', fromPrice: null }).price, null, 'no invented price');
  assert.equal(normalizeMovie({ ...live, showStatus: 'coming_soon' }, new Date('2030-01-01')).status, 'coming_soon');
  assert.equal(normalizeMovie({ ...apiMovie, showStatus: 'bogus' }, new Date('2026-12-01')).status, 'now_showing', 'an unknown answer falls back to the release date');
});
