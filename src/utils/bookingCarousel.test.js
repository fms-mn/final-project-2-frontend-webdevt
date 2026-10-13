import test from 'node:test';
import assert from 'node:assert/strict';
import { activeCarouselMovie, eligibleMovies } from './bookingCarousel.js';

test('carousel uses one poster per eligible published movie at any list size', () => {
  for (const size of [0, 1, 6, 9]) {
    const movies = Array.from({ length: size }, (_, index) => ({ _id: `movie-${index}`, status: 'now_showing' }));
    const rows = movies.flatMap(movie => [{ movie }, { movie }]);
    assert.deepEqual(eligibleMovies(movies, rows), movies);
    assert.equal(activeCarouselMovie(eligibleMovies(movies, rows), 'missing'), movies[0] || null);
  }
  const unpublished = { _id: 'draft', status: 'coming_soon' };
  assert.deepEqual(eligibleMovies([unpublished], [{ movie: unpublished }]), []);
});

test('selected movie is retained only while eligible', () => {
  const first = { _id: 'first', status: 'now_showing' };
  const second = { _id: 'second', status: 'now_showing' };
  assert.equal(activeCarouselMovie([first, second], 'second'), second);
  assert.equal(activeCarouselMovie([first], 'second'), first);
  assert.equal(activeCarouselMovie([], 'second'), null);
});
