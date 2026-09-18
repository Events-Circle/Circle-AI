export const STAGING_API_ORIGIN =
  "https://events-circle-api-production.up.railway.app";
/** Always pass the origin. Generated paths already include /api/v1. */
export function apiOrigin(value: string, allowLocalHttp = false): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(allowLocalHttp && local && url.protocol === "http:"))
  )
    throw new Error(
      "API URL must be an HTTPS origin without a path, query or credentials",
    );
  return url.origin;
}
