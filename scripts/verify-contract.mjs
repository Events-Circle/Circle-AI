import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const source = JSON.parse(readFileSync("contracts/source.json", "utf8"));
for (const [path, hash] of Object.entries(source.sha256))
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    hash,
    `Contract changed without source update: ${path}`,
  );
const spec = JSON.parse(readFileSync("contracts/core.openapi.json", "utf8"));
for (const path of [
  "/api/v1/core/auth/login",
  "/api/v1/core/media",
  "/api/v1/core/suppliers",
  "/api/v1/circle-ai/brief",
  "/api/v1/circle-ai/plans",
  "/api/v1/circle-ai/plans/{id}/decision",
])
  assert(spec.paths[path], `Missing required backend route: ${path}`);
console.log(`Pinned Core contract verified: ${source.commit}`);
