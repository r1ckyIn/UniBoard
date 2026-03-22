import { describe, it, expect } from "vitest";
import { validateCanvasToken, validateEdToken } from "@/lib/validation/token";

describe("validateCanvasToken", () => {
  it("accepts a 70-digit numeric string", () => {
    const token = "1234567890123456789012345678901234567890123456789012345678901234567890";
    expect(validateCanvasToken(token)).toBe(true);
  });

  it("accepts a 51-digit numeric string (min bound)", () => {
    const token = "123456789012345678901234567890123456789012345678901";
    expect(validateCanvasToken(token)).toBe(true);
  });

  it("rejects a string containing letters", () => {
    expect(validateCanvasToken("abc123")).toBe(false);
  });

  it("rejects a too-short numeric string", () => {
    expect(validateCanvasToken("12345")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    const token =
      "  1234567890123456789012345678901234567890123456789012345678901234567890  ";
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
