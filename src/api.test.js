import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  apiFetch,
  clearSession,
  getRole,
  getToken,
  login,
  saveSession,
} from './api.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

globalThis.sessionStorage = new MemoryStorage();

test('session stores accessToken and legacy token responses', () => {
  saveSession({ accessToken: 'access.jwt.token', role: 'Admin' });
  assert.equal(getToken(), 'access.jwt.token');
  assert.equal(getRole(), 'Admin');

  saveSession({ token: 'legacy.jwt.token' });
  assert.equal(getToken(), 'legacy.jwt.token');
  assert.equal(getRole(), null);
});

test('session rejects a login response without a token', () => {
  assert.throws(
    () => saveSession({ role: 'User' }),
    /認証トークンが含まれていません/,
  );
});

test('login posts credentials and stores the returned JWT', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({ accessToken: 'issued.jwt.token', role: 'User' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    await login('employee', 'password');
    assert.equal(request.url, 'http://localhost:5200/auth/login');
    assert.deepEqual(JSON.parse(request.options.body), {
      userName: 'employee',
      password: 'password',
    });
    assert.equal(getToken(), 'issued.jwt.token');
    assert.equal(getRole(), 'User');
  } finally {
    globalThis.fetch = originalFetch;
    clearSession();
  }
});

test('API requests send the saved bearer token', async () => {
  const originalFetch = globalThis.fetch;
  saveSession({ token: 'request.jwt.token', role: 'User' });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await apiFetch('/employees');
    assert.equal(request.options.headers.Authorization, 'Bearer request.jwt.token');
  } finally {
    globalThis.fetch = originalFetch;
    clearSession();
  }
});

test('401 clears the session and announces expiration', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let dispatchedEvent;
  saveSession({ token: 'expired.jwt.token', role: 'Admin' });
  globalThis.window = {
    dispatchEvent(event) {
      dispatchedEvent = event;
    },
  };
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ title: '認証の有効期限が切れています。' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(apiFetch('/employees'), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      return true;
    });
    assert.equal(getToken(), null);
    assert.equal(dispatchedEvent.type, 'auth:expired');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    clearSession();
  }
});
