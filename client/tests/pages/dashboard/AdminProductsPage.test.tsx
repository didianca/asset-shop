import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import { useProductStore } from "../../../src/stores/productStore";
import AdminProductsPage from "../../../src/pages/dashboard/AdminProductsPage";
import { getProducts } from "../../../src/api/products.api";

vi.mock("../../../src/api/products.api", () => ({
  getProducts: vi.fn().mockResolvedValue({ data: [] }),
  getTags: vi.fn().mockResolvedValue({ data: [] }),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}));

describe("AdminProductsPage", () => {
  beforeEach(() => {
    useProductStore.setState({ products: [], tags: [], isLoading: false });
  });

  it("renders heading", async () => {
    renderWithRouter(<AdminProductsPage />);
    expect(
      await screen.findByText("Manage Products"),
    ).toBeInTheDocument();
  });

  it("renders Create Product button", async () => {
    renderWithRouter(<AdminProductsPage />);
    expect(
      await screen.findByRole("button", { name: "Create Product" }),
    ).toBeInTheDocument();
  });

  it("shows empty message when no products", async () => {
    renderWithRouter(<AdminProductsPage />);
    expect(
      await screen.findByText("No products yet."),
    ).toBeInTheDocument();
  });

  it("renders product rows when products exist", async () => {
    const products = [
      {
        id: "p1",
        name: "Test Product",
        slug: "test-product",
        description: null,
        price: 25,
        discountPercent: null,
        tags: [],
        previewUrl: "https://example.com/img.jpg",
        assetUrl: "https://example.com/file.zip",
        bundle: null,
        isActive: true,
        createdBy: "admin-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(getProducts).mockResolvedValueOnce({ data: products } as never);
    useProductStore.setState({ products, isLoading: false });
    renderWithRouter(<AdminProductsPage />);
    expect(
      await screen.findByText("Test Product"),
    ).toBeInTheDocument();
  });
});
