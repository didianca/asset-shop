import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderDetail from "../../../src/components/orders/OrderDetail";
import type { OrderResponse } from "../../../src/types/api";

const makeOrder = (): OrderResponse => ({
  id: "order-abcdef12-3456-7890",
  userId: "user-1",
  status: "paid",
  totalAmount: 45,
  items: [
    {
      productId: "p1",
      name: "Asset One",
      slug: "asset-one",
      unitPrice: 25,
      previewUrl: "https://example.com/1.jpg",
    },
    {
      productId: "p2",
      name: "Asset Two",
      slug: "asset-two",
      unitPrice: 20,
      previewUrl: "https://example.com/2.jpg",
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
      note: "Stripe payment",
      changedBy: null,
      createdAt: "2026-01-01T11:00:00Z",
    },
  ],
  payment: {
    id: "pay-1",
    amount: 45,
    status: "captured",
    provider: "stripe",
    createdAt: "2026-01-01T11:00:00Z",
  },
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T11:00:00Z",
});

describe("OrderDetail", () => {
  it("renders order id", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    expect(screen.getByText(/order-ab/)).toBeInTheDocument();
  });

  it("renders all items", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    expect(screen.getByText("Asset One")).toBeInTheDocument();
    expect(screen.getByText("Asset Two")).toBeInTheDocument();
  });

  it("renders total amount", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    expect(screen.getByText("$45.00")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    const paidElements = screen.getAllByText("Paid");
    expect(paidElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders payment info", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    expect(screen.getByText("Provider: stripe")).toBeInTheDocument();
  });

  it("renders status timeline", () => {
    render(<OrderDetail order={makeOrder()} onBack={() => {}} />);
    expect(screen.getByText("Stripe payment")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<OrderDetail order={makeOrder()} onBack={onBack} />);
    await user.click(screen.getByText(/Back/));
    expect(onBack).toHaveBeenCalled();
  });
});
