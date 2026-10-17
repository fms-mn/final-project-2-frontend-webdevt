import test from 'node:test';
import assert from 'node:assert/strict';
import { movieWorkflow } from './movieWorkflow.js';

const day = '2026-10-17';
const movie = { status: 'draft', releaseDate: '2026-10-01', upcomingShowings: 0 };
test('drafts have a clear next step, including hidden-only schedules', () => {
  assert.equal(movieWorkflow(movie, day).action, 'schedule');
  assert.equal(movieWorkflow({ ...movie, upcomingShowings: 2 }, day).action, 'publish');
  assert.equal(movieWorkflow({ ...movie, hiddenShowings: 2 }, day).action, 'showings');
});
test('published announcements and advance sales describe different customer states', () => {
  const future = { ...movie, status: 'published', releaseDate: '2026-12-01' };
  assert.match(movieWorkflow(future, day).title, /announcement live/);
  assert.match(movieWorkflow({ ...future, upcomingShowings: 1 }, day).title, /Advance tickets on sale/);
  assert.match(movieWorkflow({ ...future, hiddenShowings: 1 }, day).title, /showings hidden/);
});
test('a released movie with closed sales asks for later showings, while archived movies ask for restore', () => {
  assert.match(movieWorkflow({ ...movie, status: 'published', scheduledShowings: 1 }, day).text, /sales have closed/);
  assert.equal(movieWorkflow({ ...movie, status: 'archived' }, day).action, 'restore');
});
