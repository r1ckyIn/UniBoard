import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  hashToken,
  readTokenCache,
  writeTokenCache,
  clearTokenCache,
  isTokenCachedAndFresh,
} from "@/lib/setup/tokenCache";

const STORAGE_KEY = "uniboard.setup.tokenValidated";

describe("tokenCache", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("hashToken returns 64-char hex SHA-256", async () => {
    const hash = await hashToken("hello-world");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashToken returns the same value for the same input across calls", async () => {
    const a = await hashToken("same-token");
    const b = await hashToken("same-token");
    expect(a).toBe(b);
    const c = await hashToken("different-token");
    expect(c).not.toBe(a);
  });

  it("writeTokenCache persists {hash, validatedAt} under STORAGE_KEY", () => {
    writeTokenCache("canvas", "abc123");
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}");
    expect(parsed.canvas).toBeDefined();
    expect(parsed.canvas.hash).toBe("abc123");
    expect(typeof parsed.canvas.validatedAt).toBe("string");
    // validatedAt must parse as a valid ISO date
    expect(Number.isNaN(Date.parse(parsed.canvas.validatedAt))).toBe(false);
  });

  it("readTokenCache returns {} when STORAGE_KEY is absent", () => {
    expect(readTokenCache()).toEqual({});
  });

  it("readTokenCache returns {} when stored JSON is corrupt", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not json");
    expect(readTokenCache()).toEqual({});
  });

  it("isTokenCachedAndFresh returns true when cached entry < 5 min old and hash matches", async () => {
    const token = "my-token";
    const hash = await hashToken(token);
    writeTokenCache("canvas", hash);
    await expect(isTokenCachedAndFresh("canvas", token)).resolves.toBe(true);
  });

  it("isTokenCachedAndFresh returns false when cached entry > 5 min old", async () => {
    const token = "my-token";
    const hash = await hashToken(token);
    // Hand-craft a stale entry (6 min ago)
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ canvas: { hash, validatedAt: stale } }),
    );
    await expect(isTokenCachedAndFresh("canvas", token)).resolves.toBe(false);
  });

  it("isTokenCachedAndFresh returns false when hash does not match (different token)", async () => {
    const originalHash = await hashToken("original");
    writeTokenCache("canvas", originalHash);
    await expect(isTokenCachedAndFresh("canvas", "different")).resolves.toBe(false);
  });

  it("isTokenCachedAndFresh returns false when no entry exists for platform", async () => {
    writeTokenCache("canvas", "abc123");
    await expect(isTokenCachedAndFresh("ed", "any-token")).resolves.toBe(false);
  });

  it("clearTokenCache(platform) removes only that platform's entry", async () => {
    const canvasHash = await hashToken("canvas-tok");
    const edHash = await hashToken("ed-tok");
    writeTokenCache("canvas", canvasHash);
    writeTokenCache("ed", edHash);
    clearTokenCache("canvas");
    const remaining = readTokenCache();
    expect(remaining.canvas).toBeUndefined();
    expect(remaining.ed).toBeDefined();
  });

  it("clearTokenCache() removes the whole key", () => {
    writeTokenCache("canvas", "a");
    writeTokenCache("ed", "b");
    clearTokenCache();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readTokenCache()).toEqual({});
  });

  it("clearTokenCache removes storage key when last platform is cleared", async () => {
    writeTokenCache("canvas", "a");
    clearTokenCache("canvas");
    // Empty cache: storage key should be removed, not left as "{}"
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
