import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../helpers";
import { useProductStore } from "../../src/stores/productStore";
import CatalogPage from "../../src/pages/CatalogPage";

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
  tags: [] as string[],
  previewUrl: "https://example.com/img.jpg",
  assetUrl: "https://example.com/file.zip",
  bundle: null,
  isActive: true,
  createdBy: "admin-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("CatalogPage", () => {
  beforeEach(() => {
    useProductStore.setState({ products: [], tags: [], isLoading: false });
  });

  it("renders heading", async () => {
    renderWithRouter(<CatalogPage />);
    expect(
      await screen.findByText("Product Catalog"),
    ).toBeInTheDocument();
  });

  it("shows product count", () => {
    useProductStore.setState({
      products: [
        makeProduct({ id: "p1", name: "A", slug: "a" }),
        makeProduct({ id: "p2", name: "B", slug: "b" }),
      ],
      isLoading: false,
    });
    renderWithRouter(<CatalogPage />);
    expect(screen.getByText("2 products")).toBeInTheDocument();
  });

  it("shows empty message when no products", async () => {
    renderWithRouter(<CatalogPage />);
    expect(
      await screen.findByText("No products found."),
    ).toBeInTheDocument();
  });

  it("filters products by tag", async () => {
    const user = userEvent.setup();
    useProductStore.setState({
      products: [
        makeProduct({ id: "p1", name: "Icon Pack", slug: "icon-pack", tags: ["icons"] }),
        makeProduct({ id: "p2", name: "Font Pack", slug: "font-pack", tags: ["fonts"] }),
      ],
      tags: ["icons", "fonts"],
      isLoading: false,
    });
    renderWithRouter(<CatalogPage />);
    await user.click(screen.getByRole("button", { name: "icons" }));
    expect(screen.getByText("Icon Pack")).toBeInTheDocument();
    expect(screen.queryByText("Font Pack")).not.toBeInTheDocument();
    expect(screen.getByText("1 product")).toBeInTheDocument();
  });
});
