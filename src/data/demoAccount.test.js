import assert from 'node:assert/strict';
import test from 'node:test';
import { endDemoSession, getDemoUser, startDemoSession, updateDemoUser } from './demoAccount.js';

test('the preview account persists profile edits but keeps a fixed user identity', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  assert.equal(getDemoUser(), null);
  assert.deepEqual(startDemoSession(), {
    id: 'demo-user', name: 'Preview User', email: 'demo@filme.local',
    phone: '', role: 'user', isDemo: true,
  });
  updateDemoUser({ name: '  Alex  ', phone: ' 09170000000 ' });
  assert.equal(getDemoUser().name, 'Alex');
  assert.equal(getDemoUser().phone, '09170000000');

  values.set('filme_preview_user', JSON.stringify({
    name: 'Alex', role: 'admin', id: 'someone-else', phone: '',
  }));
  assert.equal(getDemoUser().role, 'user');
  assert.equal(getDemoUser().id, 'demo-user');

  endDemoSession();
  assert.equal(getDemoUser(), null);
  delete globalThis.localStorage;
});
