import { describe, it, expect } from "vitest";
import { effectivePrice, isValidTransition, isWithinRefundWindow, formatOrder } from "../utils.js";

describe("effectivePrice", () => {
  it("returns the original price when discountPercent is null", () => {
    expect(effectivePrice(100, null)).toBe(100);
  });

  it("returns the original price when discountPercent is 0", () => {
    expect(effectivePrice(100, 0)).toBe(100);
  });

  it("applies the discount correctly", () => {
    expect(effectivePrice(100, 20)).toBe(80);
  });

  it("rounds to 2 decimal places", () => {
    expect(effectivePrice(10, 33)).toBe(6.7);
  });
});

describe("isValidTransition", () => {
  it("allows pending -> paid", () => {
    expect(isValidTransition("pending", "paid")).toBe(true);
  });

  it("allows paid -> fulfilled", () => {
    expect(isValidTransition("paid", "fulfilled")).toBe(true);
  });

  it("allows paid -> refunded", () => {
    expect(isValidTransition("paid", "refunded")).toBe(true);
  });

  it("allows fulfilled -> refunded", () => {
    expect(isValidTransition("fulfilled", "refunded")).toBe(true);
  });

  it("rejects pending -> fulfilled", () => {
    expect(isValidTransition("pending", "fulfilled")).toBe(false);
  });

  it("rejects paid -> pending (backward)", () => {
    expect(isValidTransition("paid", "pending")).toBe(false);
  });

  it("rejects refunded -> anything (terminal)", () => {
    expect(isValidTransition("refunded", "paid")).toBe(false);
  });

  it("returns false for unknown status", () => {
    expect(isValidTransition("unknown", "paid")).toBe(false);
  });
});

describe("isWithinRefundWindow", () => {
  it("returns true when fulfilled less than 30 days ago", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isWithinRefundWindow(tenDaysAgo)).toBe(true);
  });

  it("returns false when fulfilled more than 30 days ago", () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(isWithinRefundWindow(thirtyOneDaysAgo)).toBe(false);
  });

  it("returns true at exactly 30 days", () => {
    const justUnderThirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 1000);
    expect(isWithinRefundWindow(justUnderThirtyDays)).toBe(true);
  });
});

describe("formatOrder", () => {
  const baseOrder = {
    id: "order-1",
    userId: "user-1",
    status: "pending",
    totalAmount: { toString: (): string => "25.50" },
    items: [
      {
        productId: "prod-1",
        unitPrice: { toString: (): string => "25.50" },
        product: { name: "Test Product", slug: "test-product", previewKey: "previews/preview.jpg" },
      },
    ],
    statusHistory: [
      { id: "sh-1", status: "pending", note: "Order created", changedBy: "user-1", createdAt: new Date("2026-01-01") },
    ],
    payment: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  it("converts Decimal fields to numbers", () => {
    const result = formatOrder(baseOrder);
    expect(result.totalAmount).toBe(25.5);
    expect(result.items[0]!.unitPrice).toBe(25.5);
  });

  it("returns null payment when no payment exists", () => {
    const result = formatOrder(baseOrder);
    expect(result.payment).toBeNull();
  });

  it("formats payment when present", () => {
    const orderWithPayment = {
      ...baseOrder,
      payment: {
        id: "pay-1",
        amount: { toString: (): string => "25.50" },
        status: "captured",
        provider: "stripe",
        createdAt: new Date("2026-01-02"),
      },
    };
    const result = formatOrder(orderWithPayment);
    expect(result.payment).not.toBeNull();
    expect(result.payment!.id).toBe("pay-1");
    expect(result.payment!.amount).toBe(25.5);
    expect(result.payment!.status).toBe("captured");
    expect(result.payment!.provider).toBe("stripe");
  });

  it("maps items correctly", () => {
    const result = formatOrder(baseOrder);
    expect(result.items[0]!.productId).toBe("prod-1");
    expect(result.items[0]!.name).toBe("Test Product");
    expect(result.items[0]!.slug).toBe("test-product");
    expect(result.items[0]!.unitPrice).toBe(25.5);
    expect(result.items[0]!.previewUrl).toContain("previews/preview.jpg");
  });

  it("maps status history correctly", () => {
    const result = formatOrder(baseOrder);
    expect(result.statusHistory[0]).toEqual({
      id: "sh-1",
      status: "pending",
      note: "Order created",
      changedBy: "user-1",
      createdAt: new Date("2026-01-01"),
    });
  });

  it("includes user info when present", () => {
    const orderWithUser = {
      ...baseOrder,
      user: { email: "john@example.com", firstName: "John", lastName: "Doe" },
    };
    const result = formatOrder(orderWithUser);
    expect(result.user).toEqual({
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("omits user field when not present", () => {
    const result = formatOrder(baseOrder);
    expect(result.user).toBeUndefined();
  });
});
