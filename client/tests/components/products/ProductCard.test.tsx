import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import ProductCard from "../../../src/components/products/ProductCard";
import type { ProductResponse } from "../../../src/types/api";

const makeProduct = (overrides?: Partial<ProductResponse>): ProductResponse => ({
  id: "p1",
  name: "Test Asset",
  slug: "test-asset",
  description: null,
  price: 25,
  discountPercent: null,
  isActive: true,
  tags: ["dark", "minimalist"],
  previewUrl: "https://example.com/preview.jpg",
  assetUrl: "https://example.com/asset.zip",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("ProductCard", () => {
  it("renders product name", () => {
    renderWithRouter(<ProductCard product={makeProduct()} />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    renderWithRouter(<ProductCard product={makeProduct()} />);
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("shows discount badge and original price when discounted", () => {
    renderWithRouter(
      <ProductCard product={makeProduct({ discountPercent: 20 })} />,
    );
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderWithRouter(<ProductCard product={makeProduct()} />);
    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(screen.getByText("minimalist")).toBeInTheDocument();
  });

  it("shows +N for more than 3 tags", () => {
    renderWithRouter(
      <ProductCard
        product={makeProduct({ tags: ["a", "b", "c", "d", "e"] })}
      />,
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("links to the product detail page", () => {
    renderWithRouter(<ProductCard product={makeProduct()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products/test-asset");
  });

  it("renders the preview image", () => {
    renderWithRouter(<ProductCard product={makeProduct()} />);
    const img = screen.getByAltText("Test Asset");
    expect(img).toHaveAttribute("src", "https://example.com/preview.jpg");
  });
});
