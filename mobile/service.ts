import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import {
  AuthSession,
  type Tokens,
  type SessionStore,
} from "../src/api/session";
import { apiOrigin, STAGING_API_ORIGIN } from "../src/api/config";
import type { components } from "../src/api/schema";
export type Models = components["schemas"];
export type Collection = "portfolio" | "listings" | "gallery";
export type Content = Models["ContentResponseDto"];
export const origin = apiOrigin(
  process.env.EXPO_PUBLIC_API_URL || STAGING_API_ORIGIN,
);
let cached: Tokens | null = null;
let savedAt = 0;
const key = "events-circle-ai-session";
export const store: SessionStore = {
  async read() {
    return cached;
  },
  async write(tokens) {
    const at = Date.now();
    if (Platform.OS !== "web")
      await SecureStore.setItemAsync(key, JSON.stringify({ tokens, at }));
    cached = tokens;
    savedAt = at;
  },
  async clear() {
    cached = null;
    savedAt = 0;
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(key);
  },
};
export const session = new AuthSession({ origin }, store);
export async function restore() {
  if (Platform.OS === "web") return false;
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return false;
  try {
    const value = JSON.parse(raw);
    if (typeof value.tokens?.refreshToken !== "string")
      throw new Error("Invalid session");
    cached = value.tokens;
    savedAt = value.at;
    await session.refresh();
    return true;
  } catch {
    await store.clear();
    return false;
  }
}
export async function authorization() {
  if (cached && Date.now() - savedAt >= (cached.expiresIn - 45) * 1000) {
    try {
      await session.refresh();
    } catch {
      throw new HttpError(401, "Your session expired. Please sign in again.");
    }
  }
  const identity = await session.identity();
  if (!identity) throw new HttpError(401, "Please sign in again.");
  return `Bearer ${identity.accessToken}`;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function explain(error: unknown) {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error && "status" in error) {
    const status = Number(error.status);
    return status === 401
      ? "Email or password is incorrect, or your session expired."
      : status === 409
        ? "This email is already registered."
        : status === 400
          ? "Check your details. Passwords need 12–128 characters."
          : "The request failed. Please try again.";
  }
  return "Could not connect. Check your connection and try again. If you were saving, refresh before retrying.";
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    org?: string;
    public?: boolean;
    optional?: boolean;
  } = {},
): Promise<T> {
  if (!path.startsWith("/api/v1/") || path.includes(".."))
    throw new Error("Invalid API path");
  const headers: Record<string, string> = {};
  if (!options.public) headers.Authorization = await authorization();
  if (options.org) headers["X-Organization-Id"] = options.org;
  if (options.body) headers["Content-Type"] = "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch(origin + path, {
      method: options.method || "GET",
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      credentials: "omit",
      redirect: "error",
    });
    if (r.status === 404 && options.optional) return null as T;
    if (!r.ok) {
      if (r.status === 401) await store.clear();
      let missing: string[] = [];
      try {
        missing = (await r.json()).details?.missing || [];
      } catch {}
      throw new HttpError(
        r.status,
        r.status === 401
          ? "Your session expired. Please sign in again."
          : r.status === 403
            ? "Your role does not allow this action."
            : r.status === 409
              ? "This item changed. Close this editor and refresh before trying again."
              : r.status === 422
                ? `Not ready yet. ${missing.join(", ") || "Check the fields and required images."}`
                : r.status === 503
                  ? "This feature is not configured yet."
                  : r.status === 400
                    ? "Please check the fields and try again."
                    : "The request failed. Refresh before trying again.",
      );
    }
    if (r.status === 204) return undefined as T;
    return (await r.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
async function timedFetch(url: string, options: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "omit",
      redirect: "error",
    });
  } finally {
    clearTimeout(timer);
  }
}
export async function allContent(
  collection: Collection,
  org: string,
): Promise<Content[]> {
  const result: Content[] = [];
  let cursor = "";
  for (let page = 0; page < 6; page++) {
    const headers = {
      Authorization: await authorization(),
      "X-Organization-Id": org,
    };
    const r = await timedFetch(
      `${origin}/api/v1/presence/collections/${collection}?limit=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
      { headers, credentials: "omit", redirect: "error" },
    );
    if (!r.ok) {
      if (r.status === 401) await store.clear();
      throw new HttpError(
        r.status,
        "Could not load your content. Please refresh.",
      );
    }
    result.push(...(await r.json()));
    cursor = r.headers.get("X-Next-Cursor") || "";
    if (!cursor) return result;
  }
  throw new Error("Pagination limit exceeded");
}
export async function pickImage(org: string) {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
    throw new HttpError(400, "Choose an image under 5 MB.");
  const type = asset.mimeType || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(type))
    throw new HttpError(400, "Choose a JPEG, PNG or WebP image.");
  const form = new FormData();
  if (Platform.OS === "web")
    form.append(
      "file",
      await (await fetch(asset.uri)).blob(),
      asset.fileName || "photo.jpg",
    );
  else {
    // SDK 56+ uses Expo fetch: multipart bodies need a real Blob/File,
    // rather than React Native's legacy { uri, name, type } object.
    const file = new File(asset.uri);
    if (file.size > 5 * 1024 * 1024)
      throw new HttpError(400, "Choose an image under 5 MB.");
    form.append(
      "file",
      file.slice(0, file.size, type),
      asset.fileName || file.name || "photo.jpg",
    );
  }
  const r = await timedFetch(
    origin + "/api/v1/core/media",
    {
      method: "POST",
      headers: {
        Authorization: await authorization(),
        "X-Organization-Id": org,
      },
      body: form,
    },
    45000,
  );
  if (!r.ok)
    throw new HttpError(
      r.status,
      "Upload failed. Use a static JPEG, PNG or WebP under 5 MB.",
    );
  return (await r.json()) as Models["MediaResponseDto"];
}
