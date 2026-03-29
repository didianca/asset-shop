import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import ProductGrid from "../../../src/components/products/ProductGrid";
import type { ProductResponse } from "../../../src/types/api";

const makeProduct = (overrides?: Partial<ProductResponse>): ProductResponse => ({
  id: "p1",
  name: "Asset 1",
  slug: "asset-1",
  description: null,
  price: 10,
  discountPercent: null,
  isActive: true,
  tags: [],
  previewUrl: "https://example.com/1.jpg",
  assetUrl: "https://example.com/a.zip",
  bundle: null,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("ProductGrid", () => {
  it("shows empty message when no products", () => {
    renderWithRouter(<ProductGrid products={[]} />);
    expect(screen.getByText("No products found.")).toBeInTheDocument();
  });

  it("renders product cards", () => {
    const products = [
      makeProduct({ id: "p1", name: "First", slug: "first" }),
      makeProduct({ id: "p2", name: "Second", slug: "second" }),
    ];
    renderWithRouter(<ProductGrid products={products} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
