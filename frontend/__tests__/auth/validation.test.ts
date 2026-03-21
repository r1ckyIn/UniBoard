import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  getPasswordStrength,
} from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid USYD email and non-empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@uni.sydney.edu.au",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects email without @uni.sydney.edu.au domain", () => {
    const result = loginSchema.safeParse({
      email: "test@gmail.com",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        "Please use your USYD student email (@uni.sydney.edu.au)",
      );
    }
  });

  it("rejects empty email with 'Email is required'", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Email is required");
    }
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Invalid email format");
    }
  });

  it("rejects empty password with 'Password is required'", () => {
    const result = loginSchema.safeParse({
      email: "test@uni.sydney.edu.au",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Password is required");
    }
  });
});

describe("registerSchema", () => {
  const validData = {
    displayName: "Ricky",
    email: "ricky@uni.sydney.edu.au",
    password: "password123",
    confirmPassword: "password123",
  };

  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects password less than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Password must be at least 8 characters");
    }
  });

  it("rejects mismatched confirmPassword", () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: "differentpassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Passwords do not match");
    }
  });

  it("rejects empty displayName", () => {
    const result = registerSchema.safeParse({
      ...validData,
      displayName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Display name is required");
    }
  });
});

describe("getPasswordStrength", () => {
  it('returns 0 for empty string', () => {
    expect(getPasswordStrength("")).toBe(0);
  });

  it("returns 0 for short password (< 8 chars)", () => {
    expect(getPasswordStrength("short")).toBe(0);
  });

  it("returns 1 for password >= 8 chars with no other criteria", () => {
    expect(getPasswordStrength("longenough")).toBe(1);
  });

  it("returns 3 for >= 8 chars + mixed case + digit", () => {
    // length >= 8 (1), mixed case (1), digit (1) = 3
    expect(getPasswordStrength("Longenough1")).toBe(3);
  });

  it("returns 4 for >= 12 chars + mixed case + digit + special", () => {
    // length >= 8 (1), length >= 12 (1), mixed case (1), digit (1), special (1) = 5 -> capped at 4
    expect(getPasswordStrength("LongEnough1!")).toBe(4);
  });
});
