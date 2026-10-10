import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrailerPlayback } from './trailerPlayback.js';

function harness(policy = {}) {
  const calls = { play: 0, pause: 0, destroy: 0, rewind: 0, ended: 0, failed: 0, manual: [], status: [] };
  const adapter = { play: () => { calls.play++; }, pause: () => { calls.pause++; }, rewind: () => { calls.rewind++; }, destroy: () => { calls.destroy++; } };
  const initial = { active: true, autoplay: true, manualPaused: false, ...policy };
  const player = createTrailerPlayback(adapter, initial, { onStatus: value => calls.status.push(value), onManualPause: value => calls.manual.push(value), onEnded: () => calls.ended++, onFailure: () => calls.failed++ });
  return { player, calls, adapter, initial };
}
test('ready autoplay waits for visibility; visibility resumes only an automatic pause', () => {
  const { player, calls, initial } = harness({ active: false });
  player.ready(); assert.equal(calls.play, 0);
  player.update({ ...initial, active: true }); assert.equal(calls.play, 1);
  player.playing();
  player.update({ ...initial, active: false }); player.paused();
  assert.deepEqual(calls.manual, [false]);
  player.update({ ...initial, active: true }); assert.equal(calls.play, 2);
  player.playing(); player.pause(); player.paused();
  player.update({ ...initial, active: false, manualPaused: true });
  player.update({ ...initial, active: true, manualPaused: true });
  assert.equal(calls.play, 2);
});
test('late playing after a manual pause cannot undo the pause', () => {
  const { player, calls } = harness();
  player.ready(); player.pause(); player.playing();
  assert.equal(calls.manual.at(-1), true);
  assert.equal(calls.status.at(-1), 'paused');
});
test('reduced motion permits explicit play but never starts automatically', () => {
  const { player, calls } = harness({ autoplay: false });
  player.ready(); assert.equal(calls.play, 0);
  player.resume(); player.playing(); assert.equal(calls.play, 1);
  player.ended(); player.resume(); assert.equal(calls.rewind, 1);
});
test('ended is reported only after playback and only once; disposed players cannot report events', () => {
  const { player, calls } = harness();
  player.ended(); assert.equal(calls.ended, 0);
  player.ready(); player.playing(); player.ended(); player.ended();
  assert.equal(calls.ended, 1);
  player.destroy(); player.destroy(); player.playing(); player.ended(); player.fail();
  assert.equal(calls.destroy, 1); assert.equal(calls.ended, 1); assert.equal(calls.failed, 0);
});
test('blocked autoplay preserves a poster state and permits explicit retry', async () => {
  const { player, calls, adapter, initial } = harness();
  adapter.play = () => { calls.play++; return Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })); };
  player.ready(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.status.at(-1), 'blocked'); assert.equal(calls.failed, 0);
  player.update(initial); assert.equal(calls.play, 1);
  adapter.play = () => { calls.play++; };
  player.resume(); player.playing(); assert.equal(calls.play, 2);
});
test('real playback errors report one failure and halt repeated attempts', async () => {
  const { player, calls, adapter, initial } = harness();
  adapter.play = () => Promise.reject(new Error('bad source'));
  player.ready(); await new Promise(resolve => setImmediate(resolve));
  player.fail(); player.update(initial); player.resume();
  assert.equal(calls.failed, 1);
});
test('provider and native fullscreen controls can explicitly resume a manually paused player', () => {
  const { player, calls } = harness();
  player.ready(); player.playing(); player.paused();
  assert.equal(calls.manual.at(-1), true);
  player.playing();
  assert.equal(calls.manual.at(-1), false);
  assert.equal(calls.status.at(-1), 'playing');
});
test('a late readiness event cannot restart a terminal failed source', () => {
  const { player, calls } = harness();
  player.fail(); player.ready(); player.ready();
  assert.equal(calls.play, 0);
  assert.equal(calls.failed, 1);
});
test('turning on reduced motion cancels a pending automatic play but permits explicit play', () => {
  const { player, calls, initial } = harness();
  player.ready();
  player.update({ ...initial, autoplay: false });
  player.playing(); player.paused();
  assert.notEqual(calls.status.at(-1), 'playing');
  player.resume(); player.playing();
  assert.equal(calls.status.at(-1), 'playing');
});
