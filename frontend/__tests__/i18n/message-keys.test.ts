import { describe, it, expect } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      return getKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

function getValue(
  obj: Record<string, unknown>,
  keyPath: string
): unknown {
  return keyPath
    .split(".")
    .reduce(
      (acc: unknown, k) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined,
      obj
    );
}

describe("i18n message key parity", () => {
  it("en.json and zh.json have identical key sets", () => {
    const enKeys = getKeys(en).sort();
    const zhKeys = getKeys(zh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("no empty string values in en.json", () => {
    const enKeys = getKeys(en);
    enKeys.forEach((key) => {
      const value = getValue(en as Record<string, unknown>, key);
      expect(value, `en.json key "${key}" is empty`).not.toBe("");
    });
  });

  it("no empty string values in zh.json", () => {
    const zhKeys = getKeys(zh);
    zhKeys.forEach((key) => {
      const value = getValue(zh as Record<string, unknown>, key);
      expect(value, `zh.json key "${key}" is empty`).not.toBe("");
    });
  });
});
