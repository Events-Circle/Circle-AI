import assert from "node:assert/strict";
import { createPresenceApi, STAGING_API_ORIGIN } from "../dist/index.js";
const origin = process.env.EXPO_PUBLIC_API_URL || STAGING_API_ORIGIN;
const transport = (request) =>
  fetch(request, { signal: AbortSignal.timeout(45000) });
const api = createPresenceApi({ origin, fetch: transport });
// Read-only. No accounts, uploads or other records are created.
const health = await transport(
  new Request(origin + "/api/v1/core/health/ready"),
);
assert.equal(health.status, 200);
assert.equal((await health.json()).status, "ready");
const { data, response } = await api.GET("/api/v1/core/modules");
assert.equal(response.status, 200);
assert(data?.some((x) => x.id === "circle-ai" && x.enabled && x.implemented));
const catalogs = await api.GET("/api/v1/core/catalogs/categories");
assert.equal(catalogs.response.status, 200);
assert(catalogs.data?.length);
const denied = await api.GET("/api/v1/circle-ai/brief");
assert.equal(denied.response.status, 401);
console.log(
  "PASS live staging: database readiness, Circle AI enabled, catalogs, authenticated-route protection",
);
