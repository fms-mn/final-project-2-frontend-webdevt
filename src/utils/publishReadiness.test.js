import test from 'node:test';
import assert from 'node:assert/strict';
import { predictOutcome, readiness, releaseNote } from './publishReadiness.js';

const TODAY = '2026-10-17';
const movie = (extra = {}) => ({ title: 'Toy Story', synopsis: 'Toys.', genre: 'Animation', rating: 'G', duration: 81, posterUrl: 'https://x/p.jpg', releaseDate: '2026-10-24', ...extra });

test('the release note says what the date means for publishing', () => {
  assert.equal(releaseNote('2026-10-24', TODAY).released, false);
  assert.match(releaseNote('2026-10-24', TODAY).text, /in 7 days.*Coming soon/);
  assert.match(releaseNote('2026-10-18', TODAY).text, /in 1 day\./);
  assert.match(releaseNote(TODAY, TODAY).text, /Opens today.*at least one showing/);
  assert.match(releaseNote('2026-10-14', TODAY).text, /Released .*Oct 14.*at least one showing/);
  assert.equal(releaseNote('', TODAY).tone, 'warn');
});

test('the outcome matches what the server decides', () => {
  const soon = predictOutcome({ releaseDate: '2026-10-24', bookable: 0 }, TODAY);
  assert.equal(soon.label, 'Coming soon');
  assert.deepEqual(soon.where.map(([name, yes]) => [name, yes]), [['Home · Coming soon', true], ['Movies · Coming soon', true], ['Booking', false]]);
  assert.equal(predictOutcome({ releaseDate: '2026-10-24', bookable: 2 }, TODAY).where.at(-1)[1], true, 'advance tickets');
  assert.equal(predictOutcome({ releaseDate: '2026-10-14', bookable: 3 }, TODAY).label, 'Now showing');
  assert.equal(predictOutcome({ releaseDate: '2026-10-14', bookable: 0 }, TODAY).label, 'No showings');
  assert.equal(predictOutcome({ releaseDate: '', bookable: 0 }, TODAY).label, 'Not set');
});

test('a released movie needs a showing; a coming-soon movie does not', () => {
  const released = readiness(movie({ releaseDate: '2026-10-14' }), { bookable: 0 }, TODAY);
  assert.equal(released.ready, false);
  assert.equal(released.blocker, 'Needs at least one showing');
  assert.equal(released.done, 3);
  assert.equal(released.required, 4);
  assert.equal(released.items.at(-1).action.schedule, true);

  const withShowing = readiness(movie({ releaseDate: '2026-10-14' }), { bookable: 3 }, TODAY);
  assert.equal(withShowing.ready, true);
  assert.equal(withShowing.done, 4);

  const soon = readiness(movie(), { bookable: 0 }, TODAY);
  assert.equal(soon.ready, true);
  assert.equal(soon.required, 3, 'the showings row is only advice');
  assert.equal(soon.items.at(-1).state, 'optional');
});

test('missing details block publishing and name what is missing', () => {
  const result = readiness(movie({ synopsis: ' ', duration: 0, posterUrl: '' }), { bookable: 0 }, TODAY);
  assert.equal(result.ready, false);
  assert.equal(result.blocker, 'Details complete');
  assert.match(result.items[0].text, /description, length/);
  assert.equal(result.items[1].state, 'blocked');
});
