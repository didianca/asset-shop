import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CartItem from "../../../src/components/cart/CartItem";
import type { CartItemResponse } from "../../../src/types/api";

vi.mock("../../../src/stores/cartStore", () => ({
  useCartStore: (selector: (s: any) => any) =>
    selector({ removeItem: vi.fn() }),
}));

vi.mock("../../../src/stores/uiStore", () => ({
  useUiStore: (selector: (s: any) => any) =>
    selector({ addToast: vi.fn() }),
}));

const makeItem = <T extends object>(overrides: T): CartItemResponse & T => ({
  productId: "p1",
  name: "Test Asset",
  slug: "test-asset",
  price: 50,
  discountPercent: null,
  previewUrl: "https://example.com/preview.jpg",
  addedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("CartItem", () => {
  it("renders item name and price", () => {
    render(<CartItem item={makeItem({})} />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("shows line-through original price when discounted", () => {
    render(<CartItem item={makeItem({ discountPercent: 20 })} />);
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("does not show line-through original price when discountPercent is 0", () => {
    render(<CartItem item={makeItem({ discountPercent: 0 })} />);
    expect(screen.getAllByText("$50.00")).toHaveLength(1);
  });

  it("does not show line-through original price when discountPercent is null", () => {
    render(<CartItem item={makeItem({ discountPercent: null })} />);
    expect(screen.getAllByText("$50.00")).toHaveLength(1);
  });

  it("renders remove button", () => {
    render(<CartItem item={makeItem({})} />);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
