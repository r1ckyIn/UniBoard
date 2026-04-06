/**
 * Canvas tokens have format {numeric_id}~{alphanumeric_secret},
 * e.g. 3156~PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde
 */
export function validateCanvasToken(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+~[A-Za-z0-9]{20,}$/.test(trimmed);
}

/**
 * Ed Discussion tokens are shorter alphanumeric strings.
 * Pattern: alphanumeric + hyphens/underscores, 10-50 chars.
 */
export function validateEdToken(value: string): boolean {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9._-]{10,80}$/.test(trimmed);
}
