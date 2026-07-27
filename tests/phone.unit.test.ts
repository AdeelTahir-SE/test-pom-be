import { describe, it, expect } from "vitest";
import { isValidPhone, normalizePhone, toTelHref } from "../src/lib/phone";

describe("phone helpers — one-tap tel:", () => {
  it("accepts Slovenian-style numbers with spaces", () => {
    expect(isValidPhone("+386 40 111 222")).toBe(true);
    expect(normalizePhone("+386 40 111 222")).toBe("+38640111222");
    expect(toTelHref("+386 40 111 222")).toBe("tel:+38640111222");
  });

  it("accepts numbers without country code", () => {
    expect(normalizePhone("040 123 456")).toBe("040123456");
    expect(toTelHref("040-123-456")).toBe("tel:040123456");
  });

  it("rejects empty / too short / letters", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("not-a-phone")).toBe(false);
    expect(normalizePhone("abc")).toBeNull();
    expect(toTelHref(null)).toBeNull();
  });
});
