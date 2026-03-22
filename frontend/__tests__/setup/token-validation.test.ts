import { describe, it, expect } from "vitest";
import { validateCanvasToken, validateEdToken } from "@/lib/validations/token";

describe("validateCanvasToken", () => {
  it("accepts a valid {id}~{secret} format token", () => {
    const token = "3156~PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde";
    expect(validateCanvasToken(token)).toBe(true);
  });

  it("accepts a token with a longer numeric id", () => {
    const token = "123456~AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
    expect(validateCanvasToken(token)).toBe(true);
  });

  it("rejects a token without tilde separator", () => {
    expect(validateCanvasToken("PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde")).toBe(false);
  });

  it("rejects a pure-digit token (old format)", () => {
    const token = "1234567890123456789012345678901234567890123456789012345678901234567890";
    expect(validateCanvasToken(token)).toBe(false);
  });

  it("rejects a token with too-short secret after tilde", () => {
    expect(validateCanvasToken("3156~shortSecret")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateCanvasToken("")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    const token = "  3156~PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde  ";
    expect(validateCanvasToken(token)).toBe(true);
  });
});

describe("validateEdToken", () => {
  it("accepts alphanumeric string with underscores and hyphens", () => {
    expect(validateEdToken("abcDEF123_-test")).toBe(true);
  });

  it("accepts a 10-char string (min bound)", () => {
    expect(validateEdToken("a2b3c4d5e6")).toBe(true);
  });

  it("rejects a too-short string", () => {
    expect(validateEdToken("abc")).toBe(false);
  });

  it("rejects a string with spaces", () => {
    expect(validateEdToken("valid token with spaces")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(validateEdToken("  validtoken123  ")).toBe(true);
  });
});
