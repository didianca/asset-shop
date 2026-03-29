import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import { useCartStore } from "../../src/stores/cartStore";
import CheckoutPage from "../../src/pages/CheckoutPage";

vi.mock("../../src/api/cart.api", () => ({
  getCart: vi.fn().mockResolvedValue({
    data: { id: "c1", items: [], total: 0 },
  }),
  addCartItems: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock("../../src/api/orders.api", () => ({
  createOrder: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("../../src/api/payments.api", () => ({
  createPayment: vi.fn(),
  getPayment: vi.fn(),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

describe("CheckoutPage", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, isLoading: false });
  });

  it("shows empty cart message when no items", async () => {
    renderWithRouter(<CheckoutPage />);
    expect(
      await screen.findByText("Your cart is empty."),
    ).toBeInTheDocument();
  });

  it("renders checkout heading with items", () => {
    useCartStore.setState({
      items: [
        {
          productId: "p1",
          name: "Test Asset",
          slug: "test-asset",
          price: 30,
          discountPercent: null,
          previewUrl: "https://example.com/img.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 30,
      isLoading: false,
    });
    renderWithRouter(<CheckoutPage />);
    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  it("renders order summary with item name and total", () => {
    useCartStore.setState({
      items: [
        {
          productId: "p1",
          name: "Test Asset",
          slug: "test-asset",
          price: 30,
          discountPercent: null,
          previewUrl: "https://example.com/img.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 30,
      isLoading: false,
    });
    renderWithRouter(<CheckoutPage />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
  });

  it("renders Place Order button", () => {
    useCartStore.setState({
      items: [
        {
          productId: "p1",
          name: "Asset",
          slug: "asset",
          price: 10,
          discountPercent: null,
          previewUrl: "https://example.com/img.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 10,
      isLoading: false,
    });
    renderWithRouter(<CheckoutPage />);
    expect(
      screen.getByRole("button", { name: "Place Order & Pay" }),
    ).toBeInTheDocument();
  });
});
