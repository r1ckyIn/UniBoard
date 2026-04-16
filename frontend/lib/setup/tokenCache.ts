// Per-platform token validation cache.
//
// Stores SHA-256 hash of the last successfully validated token in
// sessionStorage. TokenStep consults this before calling the backend
// validate-and-save endpoint so users who navigate back + forward (or
// reload the setup flow within 5 minutes) don't incur duplicate
// validation requests for unchanged tokens.
//
// The cache is deliberately session-scoped (not localStorage) to avoid
// leaking token-hash fingerprints across browser sessions. Editing the
// token input clears the relevant entry so edits always re-validate.

export type Platform = "canvas" | "ed";

const STORAGE_KEY = "uniboard.setup.tokenValidated";
const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  hash: string;
  validatedAt: string;
}

type CacheShape = Partial<Record<Platform, CacheEntry>>;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function getSubtle(): SubtleCrypto | null {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

export async function hashToken(token: string): Promise<string> {
  const subtle = getSubtle();
  if (subtle === null) {
    // Defensive fallback: crypto.subtle is always present in modern
    // browsers and in Node 20+ via the webcrypto global. Returning an
    // empty string short-circuits cache matching (never equals a real
    // hash) so the caller silently falls back to a network validation.
    return "";
  }
  const bytes = new TextEncoder().encode(token);
  const buf = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function readTokenCache(): CacheShape {
  if (!hasWindow()) {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return {};
    }
    return parsed as CacheShape;
  } catch {
    // Corrupt JSON or storage access denied — treat as empty cache.
    return {};
  }
}

export function writeTokenCache(platform: Platform, hash: string): void {
  if (!hasWindow()) {
    return;
  }
  try {
    const current = readTokenCache();
    current[platform] = {
      hash,
      validatedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage may be full or disabled (private browsing); silently no-op.
  }
}

export function clearTokenCache(platform?: Platform): void {
  if (!hasWindow()) {
    return;
  }
  try {
    if (platform === undefined) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const current = readTokenCache();
    delete current[platform];
    if (Object.keys(current).length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Silently no-op on storage errors.
  }
}

export async function isTokenCachedAndFresh(
  platform: Platform,
  token: string,
): Promise<boolean> {
  if (!hasWindow()) {
    return false;
  }
  const cache = readTokenCache();
  const entry = cache[platform];
  if (entry === undefined) {
    return false;
  }
  const validatedAt = Date.parse(entry.validatedAt);
  if (Number.isNaN(validatedAt)) {
    return false;
  }
  if (Date.now() - validatedAt > TTL_MS) {
    return false;
  }
  const hash = await hashToken(token);
  return hash !== "" && hash === entry.hash;
}
