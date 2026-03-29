import { describe, it, expect } from "vitest";
import { formatPrice, calculateEffectivePrice, cn } from "../../src/lib/utils";

describe("formatPrice", () => {
  it("formats a whole number as currency", () => {
    expect(formatPrice(10)).toBe("$10.00");
  });

  it("formats a decimal as currency", () => {
    expect(formatPrice(9.99)).toBe("$9.99");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatPrice(1234.56)).toBe("$1,234.56");
  });
});

describe("calculateEffectivePrice", () => {
  it("returns the original price when discountPercent is null", () => {
    expect(calculateEffectivePrice(100, null)).toBe(100);
  });

  it("returns the original price when discountPercent is 0", () => {
    expect(calculateEffectivePrice(100, 0)).toBe(100);
  });

  it("applies a 10% discount", () => {
    expect(calculateEffectivePrice(100, 10)).toBe(90);
  });

  it("applies a 50% discount", () => {
    expect(calculateEffectivePrice(49.99, 50)).toBe(25);
  });

  it("applies a 100% discount", () => {
    expect(calculateEffectivePrice(100, 100)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateEffectivePrice(10, 33)).toBe(6.7);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, "baz")).toBe("foo baz");
  });

  it("handles undefined", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });
});
