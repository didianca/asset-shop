import { describe, it, expect } from "vitest";
import { formatPayment } from "../utils.js";

describe("formatPayment", () => {
  it("converts Decimal amount to number", () => {
    const result = formatPayment({
      id: "pay-1",
      orderId: "order-1",
      amount: { toString: (): string => "25.50" },
      status: "captured",
      provider: "stripe",
      providerReference: "pi_test_123",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    expect(result.amount).toBe(25.5);
    expect(result.id).toBe("pay-1");
    expect(result.orderId).toBe("order-1");
    expect(result.status).toBe("captured");
    expect(result.provider).toBe("stripe");
    expect(result.providerReference).toBe("pi_test_123");
  });

  it("handles null providerReference", () => {
    const result = formatPayment({
      id: "pay-2",
      orderId: "order-2",
      amount: 10,
      status: "pending",
      provider: "stripe",
      providerReference: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    expect(result.providerReference).toBeNull();
  });
});
