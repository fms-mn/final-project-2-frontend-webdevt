// The one place the website talks to the FILME API.
//
// - Requests go to /api on the same origin: the Express server in production, and the Vite
//   dev proxy while developing (see vite.config.js).
// - The session is an HttpOnly cookie, so every request includes credentials.
// - The server also hands out a CSRF token (login, register and GET /users/me); it is kept in
//   memory and sent as X-CSRF-Token on every write.

import { demoAdminRequest, isDemoAdminSession } from './data/demoAdminApi.js';

const BASE = '/api';
export const UNAUTHORIZED_EVENT = 'filme:unauthorized';

let csrfToken = null;

export class ApiError extends Error {
  constructor(message, { status = 0, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = the server could not be reached
    this.errors = errors; // per-field messages for validation errors
  }
}

export function forgetSession() {
  csrfToken = null;
}

// Fetches every page of a list (the server sends at most 200 rows at a time), so an admin list
// never silently stops at the first page.
export async function apiAll(path, { signal } = {}) {
  const LIMIT = 200;
  const all = [];
  for (let page = 1; page <= 50; page += 1) {
    const batch = await api(`${path}${path.includes('?') ? '&' : '?'}limit=${LIMIT}&page=${page}`, { signal });
    if (!Array.isArray(batch)) return batch;
    if (batch.length && all.some((row) => row._id === batch[0]._id)) break; // a source that ignores paging
    all.push(...batch);
    if (batch.length < LIMIT) break;
  }
  return all;
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  if (import.meta.env?.DEV && isDemoAdminSession()) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    return demoAdminRequest(path, { method, body });
  }
  const isWrite = method !== 'GET' && method !== 'HEAD';

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(isWrite && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // A request cancelled while its answer is still arriving is a cancel, not an empty answer.
    if (error.name === 'AbortError') throw error;
    // otherwise: an empty or non-JSON body
  }

  if (!response.ok) {
    // A 401 on a normal request means the session ended (it lasts a couple of hours).
    if (response.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') {
      csrfToken = null;
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data?.message || `Something went wrong (${response.status})`, {
      status: response.status,
      errors: data?.errors,
    });
  }

  if (data && data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
