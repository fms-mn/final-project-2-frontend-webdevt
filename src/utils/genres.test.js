import test from 'node:test';
import assert from 'node:assert/strict';
import { MOVIE_GENRES, splitGenres } from './genres.js';
import { normalizeMovie } from './movies.js';
import { movieErrors } from './movieForm.js';

test('multiple genres are separated, canonicalized and deduplicated without dropping legacy values', () => {
  assert.deepEqual(splitGenres('Action, Drama / Sci-fi | drama; Local Cinema'), ['Action', 'Drama', 'Sci-Fi', 'Local Cinema']);
  assert.deepEqual(splitGenres(['Thriller', 'Drama, Thriller']), ['Thriller', 'Drama']);
  assert.deepEqual(splitGenres(undefined), []);
  assert.deepEqual(splitGenres(' , / ; '), []);
  assert.equal(new Set(MOVIE_GENRES).size, MOVIE_GENRES.length);
});

test('saved multi-genre text reaches public movie cards as individual genres', () => {
  assert.deepEqual(normalizeMovie({ genre: 'Action, Drama, Sci-Fi' }).genre, ['Action', 'Drama', 'Sci-Fi']);
  assert.equal(movieErrors({ genre: 'Action, Drama' }).genre, undefined);
  assert.equal(movieErrors({ genre: ' , ' }).genre, 'Select at least one genre.');
});
