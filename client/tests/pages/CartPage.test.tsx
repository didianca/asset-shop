import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import { useCartStore } from "../../src/stores/cartStore";
import CartPage from "../../src/pages/CartPage";
import { getCart } from "../../src/api/cart.api";

vi.mock("../../src/api/cart.api", () => ({
  getCart: vi.fn().mockResolvedValue({
    data: { id: "cart-1", items: [], total: 0 },
  }),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
  addCartItems: vi.fn(),
}));

describe("CartPage", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0, isLoading: false });
  });

  it("shows empty cart message when no items", async () => {
    renderWithRouter(<CartPage />);
    expect(
      await screen.findByText("Your cart is empty."),
    ).toBeInTheDocument();
  });

  it("shows browse catalog button when empty", async () => {
    renderWithRouter(<CartPage />);
    expect(
      await screen.findByRole("button", { name: "Browse Catalog" }),
    ).toBeInTheDocument();
  });

  it("renders cart items when present", async () => {
    const cartItems = [
      {
        productId: "p1",
        name: "Test Asset",
        slug: "test-asset",
        price: 25,
        discountPercent: null,
        previewUrl: "https://example.com/1.jpg",
        addedAt: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(getCart).mockResolvedValueOnce({
      data: { id: "cart-1", items: cartItems, total: 25 },
    } as never);
    useCartStore.setState({
      items: cartItems,
      total: 25,
      isLoading: false,
    });
    renderWithRouter(<CartPage />);
    expect(await screen.findByText("Test Asset")).toBeInTheDocument();
    expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument();
  });
});
