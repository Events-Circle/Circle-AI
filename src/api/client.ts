import createClient from "openapi-fetch";
import type { paths } from "./schema.js";
import { apiOrigin } from "./config.js";
export interface RequestIdentity {
  accessToken: string;
  organizationId?: string;
}
export interface ApiOptions {
  origin: string;
  allowLocalHttp?: boolean;
  fetch?: typeof globalThis.fetch;
  /** Return the current session on each request, never a captured token. */
  identity?: () => RequestIdentity | null | Promise<RequestIdentity | null>;
}
export function createPresenceApi(options: ApiOptions) {
  const origin = apiOrigin(options.origin, options.allowLocalHttp);
  const client = createClient<paths>({
    baseUrl: origin,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  client.use({
    async onRequest({ request }) {
      if (new URL(request.url).origin !== origin)
        throw new Error("Cross-origin API request blocked");
      request.headers.delete("Authorization");
      request.headers.delete("X-Organization-Id");
      const identity = await options.identity?.();
      if (identity) {
        request.headers.set("Authorization", `Bearer ${identity.accessToken}`);
        if (identity.organizationId)
          request.headers.set("X-Organization-Id", identity.organizationId);
      }
      // Never forward credentials via a redirect or include ambient browser cookies.
      return new Request(request, { redirect: "error", credentials: "omit" });
    },
  });
  return client;
}
export type PresenceApi = ReturnType<typeof createPresenceApi>;
