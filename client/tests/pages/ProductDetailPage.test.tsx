import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useProductStore } from "../../src/stores/productStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useCartStore } from "../../src/stores/cartStore";
import ProductDetailPage from "../../src/pages/ProductDetailPage";

vi.mock("../../src/api/products.api", () => ({
  getProducts: vi.fn().mockResolvedValue({ data: [] }),
  getTags: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../src/api/cart.api", () => ({
  getCart: vi.fn().mockResolvedValue({ data: { id: "c1", items: [], total: 0 } }),
  addCartItems: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

const product = {
  id: "p1",
  name: "Premium Icons",
  slug: "premium-icons",
  description: "A great icon pack",
  price: 50,
  discountPercent: 20,
  tags: ["icons", "design"],
  previewUrl: "https://example.com/icons.jpg",
  assetUrl: "https://example.com/icons.zip",
  bundle: null,
  isActive: true,
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderWithSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/products/${slug}`]}>
      <Routes>
        <Route path="/products/:slug" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProductDetailPage", () => {
  beforeEach(() => {
    useProductStore.setState({ products: [product], tags: [], isLoading: false });
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    useCartStore.setState({ items: [], total: 0, isLoading: false });
  });

  it("shows product not found when slug does not match", () => {
    renderWithSlug("nonexistent");
    expect(screen.getByText("Product not found.")).toBeInTheDocument();
  });

  it("renders product name", () => {
    renderWithSlug("premium-icons");
    expect(screen.getByText("Premium Icons")).toBeInTheDocument();
  });

  it("renders product description", () => {
    renderWithSlug("premium-icons");
    expect(screen.getByText("A great icon pack")).toBeInTheDocument();
  });

  it("renders discount price", () => {
    renderWithSlug("premium-icons");
    expect(screen.getByText("-20%")).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderWithSlug("premium-icons");
    expect(screen.getByText("icons")).toBeInTheDocument();
    expect(screen.getByText("design")).toBeInTheDocument();
  });

  it("shows Login to Purchase when not authenticated", () => {
    renderWithSlug("premium-icons");
    expect(
      screen.getByRole("button", { name: "Login to Purchase" }),
    ).toBeInTheDocument();
  });

  it("shows Add to Cart when authenticated", () => {
    useAuthStore.setState({
      token: "t",
      user: { id: "u1", role: "customer", status: "active", exp: 9999999999 },
      isAuthenticated: true,
    });
    renderWithSlug("premium-icons");
    expect(
      screen.getByRole("button", { name: "Add to Cart" }),
    ).toBeInTheDocument();
  });
});
