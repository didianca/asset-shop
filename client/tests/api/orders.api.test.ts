import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ordersApi from "../../src/api/orders.api";
import apiClient from "../../src/api/client";

vi.spyOn(apiClient, "get").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "patch").mockResolvedValue({ data: {} });

describe("orders.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createOrder calls POST /orders", async () => {
    await ordersApi.createOrder();
    expect(apiClient.post).toHaveBeenCalledWith("/orders");
  });

  it("getOrders calls GET /orders with params", async () => {
    await ordersApi.getOrders({ page: 2, limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith("/orders", {
      params: { page: 2, limit: 10 },
    });
  });

  it("getOrders works without params", async () => {
    await ordersApi.getOrders();
    expect(apiClient.get).toHaveBeenCalledWith("/orders", {
      params: undefined,
    });
  });

  it("getOrder calls GET /orders/:id", async () => {
    await ordersApi.getOrder("o1");
    expect(apiClient.get).toHaveBeenCalledWith("/orders/o1");
  });

  it("updateOrderStatus calls PATCH /orders/:id/status", async () => {
    const body = { status: "paid" as const, note: "Payment received" };
    await ordersApi.updateOrderStatus("o1", body);
    expect(apiClient.patch).toHaveBeenCalledWith("/orders/o1/status", body);
  });
});
