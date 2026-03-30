import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import OrderManagement from "../../../src/components/admin/OrderManagement";
import type { OrderResponse } from "../../../src/types/api";

const baseOrder: OrderResponse = {
  id: "order-abcdef12-3456-7890",
  userId: "user-1",
  status: "paid",
  totalAmount: 50,
  items: [
    {
      productId: "p1",
      name: "Asset One",
      slug: "asset-one",
      unitPrice: 50,
      previewUrl: "https://example.com/1.jpg",
    },
  ],
  statusHistory: [
    {
      id: "h1",
      status: "pending",
      note: null,
      changedBy: null,
      createdAt: "2026-01-01T10:00:00Z",
    },
    {
      id: "h2",
      status: "paid",
      note: null,
      changedBy: null,
      createdAt: "2026-01-01T11:00:00Z",
    },
  ],
  payment: {
    id: "pay-1",
    amount: 50,
    status: "captured",
    provider: "stripe",
    createdAt: "2026-01-01T11:00:00Z",
  },
  user: { email: "jane@example.com", firstName: "Jane", lastName: "Doe" },
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T11:00:00Z",
};

let mockOrders: OrderResponse[] = [];

vi.mock("../../../src/hooks/useOrders", () => ({
  useOrders: () => ({
    orders: mockOrders,
    total: mockOrders.length,
    page: 1,
    setPage: vi.fn(),
    isLoading: false,
    selectedOrder: null,
    selectOrder: vi.fn(),
    clearSelection: vi.fn(),
    fetchOrders: vi.fn(),
    limit: 20,
  }),
}));

vi.mock("../../../src/api/orders.api", () => ({
  updateOrderStatus: vi.fn(),
}));

vi.mock("../../../src/stores/uiStore", () => ({
  useUiStore: () => vi.fn(),
}));

describe("OrderManagement — refund pending customer note", () => {
  beforeEach(() => {
    mockOrders = [];
  });

  it("shows customer's refund reason for refund_pending orders", () => {
    mockOrders = [
      {
        ...baseOrder,
        status: "refund_pending",
        statusHistory: [
          ...baseOrder.statusHistory,
          {
            id: "h3",
            status: "refund_pending",
            note: "Item was damaged on arrival",
            changedBy: "user-1",
            createdAt: "2026-01-02T10:00:00Z",
          },
        ],
      },
    ];

    renderWithRouter(<OrderManagement />);

    expect(screen.getByText("Customer's reason")).toBeInTheDocument();
    expect(screen.getByText("Item was damaged on arrival")).toBeInTheDocument();
  });

  it("does not show customer reason when refund_pending has no note", () => {
    mockOrders = [
      {
        ...baseOrder,
        status: "refund_pending",
        statusHistory: [
          ...baseOrder.statusHistory,
          {
            id: "h3",
            status: "refund_pending",
            note: null,
            changedBy: "user-1",
            createdAt: "2026-01-02T10:00:00Z",
          },
        ],
      },
    ];

    renderWithRouter(<OrderManagement />);

    expect(screen.queryByText("Customer's reason")).not.toBeInTheDocument();
  });

  it("does not show customer reason for non-refund_pending orders", () => {
    mockOrders = [baseOrder];

    renderWithRouter(<OrderManagement />);

    expect(screen.queryByText("Customer's reason")).not.toBeInTheDocument();
  });
});
