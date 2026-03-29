import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import CustomerDashboard from "../../../src/pages/dashboard/CustomerDashboard";
import * as ordersApi from "../../../src/api/orders.api";

vi.mock("../../../src/api/orders.api", () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

describe("CustomerDashboard", () => {
  it("renders heading", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [], total: 0 },
    } as never);
    renderWithRouter(<CustomerDashboard />);
    expect(screen.getByText("My Orders")).toBeInTheDocument();
  });

  it("shows orders when loaded", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: {
        orders: [
          {
            id: "order-abc12345-6789",
            userId: "u1",
            status: "pending",
            totalAmount: 50,
            items: [{ id: "i1", productId: "p1", name: "Asset", price: 50, previewUrl: "" }],
            statusHistory: [],
            payment: null,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
      },
    } as never);
    renderWithRouter(<CustomerDashboard />);
    expect(await screen.findByText("order-ab...")).toBeInTheDocument();
  });

  it("shows empty state when no orders", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [], total: 0 },
    } as never);
    renderWithRouter(<CustomerDashboard />);
    expect(
      await screen.findByText("No orders yet."),
    ).toBeInTheDocument();
  });
});
