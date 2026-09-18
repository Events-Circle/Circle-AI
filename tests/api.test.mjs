import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AuthSession,
  memorySessionStore,
  createPresenceApi,
  apiOrigin,
  ApiFailure,
} from "../dist/index.js";
const origin = "https://api.example.com";
const tokens = (n = 1) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  expiresIn: 600,
  tokenType: "Bearer",
});
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("origin rejects credentials, paths, insecure remote URLs and queries", () => {
  for (const url of [
    "http://api.example.com",
    "https://user:pass@api.example.com",
    "https://api.example.com/api/v1",
    "https://api.example.com?token=x",
  ])
    assert.throws(() => apiOrigin(url));
  assert.equal(apiOrigin(origin + "/"), origin);
  assert.equal(
    apiOrigin("http://localhost:4000", true),
    "http://localhost:4000",
  );
});
test("client uses latest session and organization; clearing identity removes stale headers", async () => {
  let identity = { accessToken: "first", organizationId: "org-a" };
  const requests = [];
  const api = createPresenceApi({
    origin,
    identity: () => identity,
    fetch: async (r) => {
      requests.push(r);
      return json({});
    },
  });
  await api.GET("/api/v1/presence/profile");
  identity = { accessToken: "second", organizationId: "org-b" };
  await api.GET("/api/v1/presence/profile");
  identity = null;
  await api.GET("/api/v1/core/me", {
    headers: { Authorization: "Bearer stale", "X-Organization-Id": "stale" },
  });
  assert.equal(requests[0].url, origin + "/api/v1/presence/profile");
  assert.equal(requests[1].headers.get("Authorization"), "Bearer second");
  assert.equal(requests[1].headers.get("X-Organization-Id"), "org-b");
  assert.equal(requests[2].headers.get("Authorization"), null);
  assert.equal(requests[2].headers.get("X-Organization-Id"), null);
  assert.equal(requests[0].redirect, "error");
  assert.equal(requests[0].credentials, "omit");
});
test("cross-origin override is blocked before credentials or network access", async () => {
  let calls = 0;
  const api = createPresenceApi({
    origin,
    identity: () => ({ accessToken: "secret" }),
    fetch: async () => {
      calls++;
      return json({});
    },
  });
  await assert.rejects(
    api.GET("/api/v1/core/me", { baseUrl: "https://evil.example.com" }),
    /Cross-origin/,
  );
  assert.equal(calls, 0);
});
test("concurrent refresh calls share one request and persist rotated tokens", async () => {
  const store = memorySessionStore();
  await store.write(tokens());
  let calls = 0;
  const session = new AuthSession(
    {
      origin,
      fetch: async (r) => {
        calls++;
        assert.equal((await r.json()).refreshToken, "refresh-1");
        return json(tokens(2));
      },
    },
    store,
  );
  const [a, b] = await Promise.all([session.refresh(), session.refresh()]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(await store.read(), tokens(2));
});
test("ambiguous refresh failure clears tokens and never retries a spent refresh token", async () => {
  const store = memorySessionStore();
  await store.write(tokens());
  let calls = 0;
  const session = new AuthSession(
    {
      origin,
      fetch: async () => {
        calls++;
        throw new Error("timeout");
      },
    },
    store,
  );
  await assert.rejects(session.refresh(), /timeout/);
  assert.equal(await store.read(), null);
  await assert.rejects(session.refresh(), /Sign-in required/);
  assert.equal(calls, 1);
});
test("logout waits for in-flight refresh then revokes using the rotated session", async () => {
  const store = memorySessionStore();
  await store.write(tokens());
  const paths = [];
  const session = new AuthSession(
    {
      origin,
      fetch: async (r) => {
        paths.push(new URL(r.url).pathname);
        if (r.url.endsWith("/refresh")) return json(tokens(2));
        assert.equal(r.headers.get("Authorization"), "Bearer access-2");
        return new Response(null, { status: 204 });
      },
    },
    store,
  );
  await Promise.all([session.refresh(), session.logout()]);
  assert.deepEqual(paths, [
    "/api/v1/core/auth/refresh",
    "/api/v1/core/auth/logout",
  ]);
  assert.equal(await store.read(), null);
});
test("logout clears local credentials even when server revocation fails", async () => {
  const store = memorySessionStore();
  await store.write(tokens());
  const session = new AuthSession(
    { origin, fetch: async () => json({ secret: "must not surface" }, 503) },
    store,
  );
  await assert.rejects(
    session.logout(),
    (e) =>
      e instanceof ApiFailure &&
      e.status === 503 &&
      !e.message.includes("secret"),
  );
  assert.equal(await store.read(), null);
});
test("login and register validate responses before storing tokens", async () => {
  const store = memorySessionStore();
  const session = new AuthSession(
    { origin, fetch: async () => json(tokens()) },
    store,
  );
  await session.login({
    email: "test@example.com",
    password: "password-not-sent-to-real-server",
  });
  assert.equal((await session.identity("org")).organizationId, "org");
  const bad = new AuthSession(
    { origin, fetch: async () => json({ accessToken: "incomplete" }) },
    store,
  );
  await assert.rejects(
    bad.register({
      email: "test@example.com",
      password: "test",
      displayName: "test",
    }),
    /Invalid token response/,
  );
  assert.deepEqual(await store.read(), tokens());
});
test("validation/conflict responses preserve backend details; writes are sent once", async () => {
  let calls = 0;
  const api = createPresenceApi({
    origin,
    fetch: async () => {
      calls++;
      return json(
        { code: "PRESENCE_NOT_READY", details: { missing: ["logoMediaId"] } },
        422,
      );
    },
  });
  const result = await api.POST("/api/v1/presence/profile/publish", {
    body: { version: 1 },
    params: { header: { "X-Organization-Id": "org" } },
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.error.code, "PRESENCE_NOT_READY");
  assert.equal(calls, 1);
});
