import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCode, codeComplete, forgetSignedIn, rememberSignedIn, wasSignedIn } from './sessionMemory.js';

test('the code box keeps digits only, six at most', () => {
  assert.equal(cleanCode(' 123 456 '), '123456');
  assert.equal(cleanCode('12-34-56-78'), '123456');
  assert.equal(cleanCode('ab1c'), '1');
  assert.equal(cleanCode(undefined), '');
  assert.equal(codeComplete('123 456'), true);
  assert.equal(codeComplete('12345'), false);
});

test('remembering a sign-in survives a browser that blocks storage', () => {
  assert.equal(wasSignedIn(), false, 'no storage at all (this test runs outside a browser)');
  assert.doesNotThrow(() => { rememberSignedIn(); forgetSignedIn(); });
  const store = new Map();
  globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
  try {
    rememberSignedIn();
    assert.equal(wasSignedIn(), true);
    forgetSignedIn();
    assert.equal(wasSignedIn(), false);
  } finally { delete globalThis.localStorage; }
});
