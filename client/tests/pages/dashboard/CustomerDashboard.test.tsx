import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import CustomerDashboard from "../../../src/pages/dashboard/CustomerDashboard";
import * as ordersApi from "../../../src/api/orders.api";
import { useAuthStore } from "../../../src/stores/authStore";

vi.mock("../../../src/api/orders.api", () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

describe("CustomerDashboard", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: "u1", role: "customer", email: "a@b.com", firstName: "A", lastName: "B", status: "active" },
      isAuthenticated: true,
      token: "tok",
    });
  });

  it("renders heading", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [], total: 0 },
    } as never);
    renderWithRouter(<CustomerDashboard />);
    expect(screen.getByText("My Orders")).toBeInTheDocument();
  });

  it("fetches only the current user's orders", async () => {
    vi.mocked(ordersApi.getOrders).mockResolvedValueOnce({
      data: { orders: [], total: 0 },
    } as never);
    renderWithRouter(<CustomerDashboard />);
    expect(ordersApi.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" }),
    );
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
