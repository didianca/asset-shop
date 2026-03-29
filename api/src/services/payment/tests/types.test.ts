import { describe, it, expect } from "vitest";
import { CreatePaymentSchema, OrderIdParamsSchema } from "../payment.types.js";

describe("CreatePaymentSchema", () => {
  it("accepts a valid orderId", () => {
    const result = CreatePaymentSchema.safeParse({ orderId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid orderId", () => {
    const result = CreatePaymentSchema.safeParse({ orderId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing orderId", () => {
    const result = CreatePaymentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects extra fields", () => {
    const result = CreatePaymentSchema.safeParse({ orderId: "550e8400-e29b-41d4-a716-446655440000", extra: true });
    expect(result.success).toBe(false);
  });
});

describe("OrderIdParamsSchema", () => {
  it("accepts a valid UUID", () => {
    const result = OrderIdParamsSchema.safeParse({ orderId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    const result = OrderIdParamsSchema.safeParse({ orderId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
