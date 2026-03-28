import { describe, it, expect } from "vitest";
import { OrderIdParamsSchema, UpdateOrderStatusSchema, GetOrdersQuerySchema } from "../order.types.js";

describe("OrderIdParamsSchema", () => {
  it("accepts a valid UUID", () => {
    const result = OrderIdParamsSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    const result = OrderIdParamsSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateOrderStatusSchema", () => {
  it("accepts a valid status", () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: "paid" });
    expect(result.success).toBe(true);
  });

  it("accepts status with optional note", () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: "fulfilled", note: "Delivery complete" });
    expect(result.success).toBe(true);
  });

  it("rejects pending as a target status", () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: "pending" });
    expect(result.success).toBe(false);
  });

  it("rejects extra fields", () => {
    const result = UpdateOrderStatusSchema.safeParse({ status: "paid", extra: true });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = UpdateOrderStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("GetOrdersQuerySchema", () => {
  it("applies defaults for page and limit", () => {
    const result = GetOrdersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 1, limit: 20 });
  });

  it("accepts valid userId filter", () => {
    const result = GetOrdersQuerySchema.safeParse({ userId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("coerces string page/limit to numbers", () => {
    const result = GetOrdersQuerySchema.safeParse({ page: "2", limit: "50" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 2, limit: 50 });
  });

  it("rejects page below 1", () => {
    const result = GetOrdersQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects limit above 100", () => {
    const result = GetOrdersQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid userId", () => {
    const result = GetOrdersQuerySchema.safeParse({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
