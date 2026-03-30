import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import { useProductStore } from "../../src/stores/productStore";
import HomePage from "../../src/pages/HomePage";

vi.mock("../../src/api/products.api", () => ({
  getProducts: vi.fn().mockResolvedValue({ data: [] }),
  getTags: vi.fn().mockResolvedValue({ data: [] }),
}));

const makeProduct = (overrides: Record<string, unknown>) => ({
  id: "p1",
  name: "Product",
  slug: "product",
  description: null,
  price: 20,
  discountPercent: null,
  tags: [],
  previewUrl: "https://example.com/img.jpg",
  assetUrl: "https://example.com/file.zip",
  isActive: true,
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("HomePage", () => {
  beforeEach(() => {
    useProductStore.setState({ products: [], tags: [], isLoading: false });
  });

  it("renders hero section", () => {
    renderWithRouter(<HomePage />);
    expect(
      screen.getByText("Premium Digital Assets"),
    ).toBeInTheDocument();
  });

  it("renders Browse Catalog button", () => {
    renderWithRouter(<HomePage />);
    expect(
      screen.getByRole("button", { name: "Browse Catalog" }),
    ).toBeInTheDocument();
  });

  it("renders Latest Additions section when products exist", () => {
    useProductStore.setState({
      products: [makeProduct({ id: "p1", name: "Asset One", slug: "asset-one" })],
      isLoading: false,
    });
    renderWithRouter(<HomePage />);
    expect(screen.getByText("Latest Additions")).toBeInTheDocument();
    expect(screen.getByText("Asset One")).toBeInTheDocument();
  });

  it("renders On Sale section for discounted products", () => {
    useProductStore.setState({
      products: [
        makeProduct({
          id: "p2",
          name: "Sale Item",
          slug: "sale-item",
          discountPercent: 20,
        }),
      ],
      isLoading: false,
    });
    renderWithRouter(<HomePage />);
    expect(screen.getByText("On Sale")).toBeInTheDocument();
  });
});
