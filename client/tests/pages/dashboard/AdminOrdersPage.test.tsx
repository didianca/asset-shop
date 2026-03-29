import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import AdminOrdersPage from "../../../src/pages/dashboard/AdminOrdersPage";
import * as ordersApi from "../../../src/api/orders.api";

vi.mock("../../../src/api/orders.api", () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

describe("AdminOrdersPage", () => {
  it("renders heading", () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [], total: 0 },
    } as never);
    renderWithRouter(<AdminOrdersPage />);
    expect(screen.getByText("Manage Orders")).toBeInTheDocument();
  });

  it("shows orders table when loaded", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: {
        orders: [
          {
            id: "order-xyz12345-6789",
            userId: "u1",
            status: "pending",
            totalAmount: 100,
            items: [{ id: "i1", productId: "p1", name: "Asset", price: 100, previewUrl: "" }],
            statusHistory: [],
            payment: null,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
      },
    } as never);
    renderWithRouter(<AdminOrdersPage />);
    expect(await screen.findByText("order-xy...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark paid" }),
    ).toBeInTheDocument();
  });
});
