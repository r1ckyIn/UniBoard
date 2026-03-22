/**
 * Canvas tokens are numeric strings, typically ~70 characters.
 * Pattern: digits only, length between 50-100 (generous range).
 */
export function validateCanvasToken(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{50,100}$/.test(trimmed);
}

/**
 * Ed Discussion tokens are shorter alphanumeric strings.
 * Pattern: alphanumeric + hyphens/underscores, 10-50 chars.
 */
export function validateEdToken(value: string): boolean {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{10,50}$/.test(trimmed);
}
