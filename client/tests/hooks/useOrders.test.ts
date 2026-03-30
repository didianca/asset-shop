import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useOrders } from "../../src/hooks/useOrders";
import * as ordersApi from "../../src/api/orders.api";

vi.mock("../../src/api/orders.api", () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

const makeOrder = (overrides: Record<string, unknown>) => ({
  id: "order-1",
  userId: "u1",
  status: "pending",
  totalAmount: 50,
  items: [],
  statusHistory: [],
  payment: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("useOrders", () => {
  beforeEach(() => {
    vi.mocked(ordersApi.getOrders).mockResolvedValue({
      data: { orders: [], total: 0 },
    } as never);
  });

  it("fetches orders on mount", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [makeOrder({})], total: 1 },
    } as never);

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("uses custom limit", async () => {
    const { result } = renderHook(() => useOrders({ limit: 20 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(ordersApi.getOrders).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("selects an order by id", async () => {
    const order = makeOrder({ id: "order-abc" });
    vi.mocked(ordersApi.getOrder).mockResolvedValueOnce({
      data: order,
    } as never);

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(() => result.current.selectOrder("order-abc"));

    expect(result.current.selectedOrder).toEqual(order);
  });

  it("clears selection", async () => {
    const order = makeOrder({ id: "order-abc" });
    vi.mocked(ordersApi.getOrder).mockResolvedValueOnce({
      data: order,
    } as never);

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(() => result.current.selectOrder("order-abc"));
    expect(result.current.selectedOrder).not.toBeNull();

    act(() => result.current.clearSelection());
    expect(result.current.selectedOrder).toBeNull();
  });
});
