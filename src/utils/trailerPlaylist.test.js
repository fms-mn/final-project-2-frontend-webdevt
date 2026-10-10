import test from 'node:test';
import assert from 'node:assert/strict';
import { trailerPlaylist, initialPlaylist, playlistTransition, playableEntries } from './trailerPlaylist.js';
import { demoMovies } from '../data/demoMovies.js';

const day = '2026-10-10';
const movies = ['one', 'two', 'three', 'hidden', 'cancelled', 'missing'].map(_id => ({ _id, title: _id, trailerUrl: _id === 'missing' ? '' : 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }));
const slots = movies.map(movie => ({ movie: movie._id, startTime: day + 'T19:00:00+08:00', status: movie._id === 'cancelled' ? 'cancelled' : 'scheduled', published: movie._id !== 'hidden' }));
const entries = trailerPlaylist(movies, slots, day);
const event = (state, type, canAdvance = true) => ({ type, key: state.current, generation: state.generation, canAdvance });

test('playlist uses distinct published noncancelled movies on the Manila day with sources', () => {
  assert.deepEqual(entries.map(entry => entry.movie._id), ['one', 'two', 'three']);
  assert.deepEqual(trailerPlaylist(movies, slots, '2026-10-11'), []);
  assert.equal(trailerPlaylist(movies, [...slots, slots[0]], day).length, 3);
});
test('actual ended events advance and wrap; stale and duplicate player events are ignored', () => {
  let state = initialPlaylist(entries);
  const stale = event(state, 'ended');
  state = playlistTransition(state, stale, entries);
  assert.equal(state.current, entries[1].key);
  assert.equal(playlistTransition(state, stale, entries), state);
  state = playlistTransition(state, event(state, 'ended'), entries);
  state = playlistTransition(state, event(state, 'ended'), entries);
  assert.equal(state.current, entries[0].key);
  assert.equal(state.generation, 3);
});
test('failure recovery is independent of showings; a new date starts at its first entry', () => {
  let state = initialPlaylist(entries);
  state = playlistTransition(state, { type: 'move', direction: 1 }, entries);
  assert.equal(state.current, entries[1].key);
  state = playlistTransition(state, { type: 'move', direction: -1 }, entries);
  assert.equal(state.current, entries[0].key);
  assert.equal(initialPlaylist(entries.slice(1)).current, entries[1].key);
  assert.equal(initialPlaylist([]).current, '');
  assert.equal('showtime' in state, false);
});
test('manual pause, hidden state and reduced motion prevent automatic advancement', () => {
  const state = initialPlaylist(entries);
  assert.equal(playlistTransition(state, event(state, 'ended', false), entries), state);
  const failed = playlistTransition(state, event(state, 'failed', false), entries);
  assert.equal(failed.current, state.current);
  assert.equal(playableEntries(entries, failed).length, 2);
});
test('failed sources are attempted at most once per session and exhaustion terminates', () => {
  let state = initialPlaylist(entries);
  for (let i = 0; i < entries.length; i++) state = playlistTransition(state, event(state, 'failed'), entries);
  assert.equal(state.current, '');
  assert.equal(playableEntries(entries, state).length, 0);
  assert.equal(playlistTransition(state, event(state, 'ended'), entries), state);
  assert.equal(state.failed.length, 3);
});
test('a one-entry playlist replays through a new player generation', () => {
  const state = initialPlaylist(entries.slice(0, 1));
  const next = playlistTransition(state, event(state, 'ended'), entries.slice(0, 1));
  assert.equal(next.current, state.current);
  assert.equal(next.generation, 1);
});
test('three demo sources have explicit labels and credits; live mode never substitutes them', () => {
  const scheduled = demoMovies.map(movie => ({ movie: movie._id, startTime: day + 'T19:00:00+08:00', published: true }));
  const demo = trailerPlaylist(demoMovies, scheduled, day, true);
  assert.ok(demo.length >= 3);
  assert.ok(demo.filter(entry => entry.media.kind === 'video').every(entry => entry.media.label.includes('not this movie') && entry.media.credit.licenseUrl && !entry.media.loop));
  assert.ok(trailerPlaylist(demoMovies, scheduled, day, false).every(entry => entry.media.kind === 'youtube'));
});
