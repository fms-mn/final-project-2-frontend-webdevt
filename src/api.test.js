import test from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, forgetSession, UNAUTHORIZED_EVENT } from './api.js';

const originalFetch = globalThis.fetch;
let calls;

function respond(status, body) {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (body === undefined) throw new Error('no body');
        return body;
      },
    };
  };
}

test.beforeEach(() => {
  calls = [];
  forgetSession();
  delete globalThis.window;
});
test.after(() => {
  globalThis.fetch = originalFetch;
});

test('requests go to /api with cookies and JSON', async () => {
  respond(200, { ok: true });
  assert.deepEqual(await api('/movies'), { ok: true });
  assert.equal(calls[0].url, '/api/movies');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.method, 'GET');

  await api('/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' } });
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[1].options.body, JSON.stringify({ email: 'a@b.c', password: 'x' }));
});

test('the CSRF token from the server is sent on writes, never on reads', async () => {
  respond(200, { user: {}, csrfToken: 'token-123' });
  await api('/auth/login', { method: 'POST', body: {} });
  assert.equal(calls[0].options.headers['X-CSRF-Token'], undefined, 'nothing to send yet');

  await api('/users/me', { method: 'PATCH', body: { name: 'A' } });
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'token-123');

  await api('/movies');
  assert.equal(calls[2].options.headers['X-CSRF-Token'], undefined);

  forgetSession();
  await api('/users/me', { method: 'PATCH', body: { name: 'A' } });
  assert.equal(calls[3].options.headers['X-CSRF-Token'], undefined, 'forgotten after logout');
});

test('server errors become ApiError with the server message, status and field errors', async () => {
  respond(400, { message: 'Validation failed', errors: { title: 'Required' } });
  await assert.rejects(api('/movies', { method: 'POST', body: {} }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Validation failed');
    assert.equal(error.status, 400);
    assert.deepEqual(error.errors, { title: 'Required' });
    return true;
  });

  respond(500, undefined);
  await assert.rejects(api('/movies'), (error) => error.status === 500 && /500/.test(error.message));
});

test('an unreachable server gives a friendly message with status 0', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(api('/movies'), (error) => {
    assert.equal(error.status, 0);
    assert.match(error.message, /Cannot reach the server/);
    return true;
  });
});

test('an aborted request is passed through untouched', async () => {
  globalThis.fetch = async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); };
  await assert.rejects(api('/movies'), (error) => error.name === 'AbortError');
});

test('a 401 on a normal request announces that the session ended; login errors do not', async () => {
  const seen = [];
  globalThis.window = {
    dispatchEvent: (event) => seen.push(event.type),
  };
  respond(401, { message: 'Authentication required' });
  await assert.rejects(api('/users/me'));
  assert.deepEqual(seen, [UNAUTHORIZED_EVENT]);

  await assert.rejects(api('/auth/login', { method: 'POST', body: {} }));
  assert.deepEqual(seen, [UNAUTHORIZED_EVENT], 'a failed login is not "the session ended"');
});
