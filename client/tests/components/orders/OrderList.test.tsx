import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderList from "../../../src/components/orders/OrderList";
import type { OrderResponse } from "../../../src/types/api";

const makeOrder = (overrides?: Partial<OrderResponse>): OrderResponse => ({
  id: "order-abcdef12-3456-7890",
  userId: "user-1",
  status: "pending",
  totalAmount: 30,
  items: [
    {
      productId: "p1",
      name: "Asset 1",
      slug: "asset-1",
      unitPrice: 30,
      previewUrl: "https://example.com/1.jpg",
    },
  ],
  statusHistory: [],
  payment: null,
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-15T10:00:00Z",
  ...overrides,
});

describe("OrderList", () => {
  it("shows empty message when no orders", () => {
    render(<OrderList orders={[]} onSelectOrder={() => {}} />);
    expect(screen.getByText("No orders yet.")).toBeInTheDocument();
  });

  it("renders order rows", () => {
    render(
      <OrderList orders={[makeOrder()]} onSelectOrder={() => {}} />,
    );
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows truncated order id", () => {
    render(
      <OrderList orders={[makeOrder()]} onSelectOrder={() => {}} />,
    );
    expect(screen.getByText("order-ab...")).toBeInTheDocument();
  });

  it("calls onSelectOrder when row is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <OrderList orders={[makeOrder()]} onSelectOrder={onSelect} />,
    );
    await user.click(screen.getByText("order-ab..."));
    expect(onSelect).toHaveBeenCalledWith("order-abcdef12-3456-7890");
  });
});
