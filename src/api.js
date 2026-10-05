// The one place the website talks to the FILME API.
//
// - Requests go to /api on the same origin: the Express server in production, and the Vite
//   dev proxy while developing (see vite.config.js).
// - The session is an HttpOnly cookie, so every request includes credentials.
// - The server also hands out a CSRF token (login, register and GET /users/me); it is kept in
//   memory and sent as X-CSRF-Token on every write.

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

export async function api(path, { method = 'GET', body, signal } = {}) {
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
  } catch {
    // empty or non-JSON body
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
