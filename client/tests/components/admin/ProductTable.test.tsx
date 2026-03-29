import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductTable from "../../../src/components/admin/ProductTable";
import type { ProductResponse } from "../../../src/types/api";

const makeProduct = (overrides?: Partial<ProductResponse>): ProductResponse => ({
  id: "p1",
  name: "Asset 1",
  slug: "asset-1",
  description: null,
  price: 10,
  discountPercent: null,
  isActive: true,
  tags: ["dark"],
  previewUrl: "https://example.com/preview.jpg",
  assetUrl: "https://example.com/asset.zip",
  bundle: null,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("ProductTable", () => {
  it("shows empty message when no products", () => {
    render(<ProductTable products={[]} onEdit={() => {}} />);
    expect(screen.getByText("No products yet.")).toBeInTheDocument();
  });

  it("renders product rows", () => {
    render(
      <ProductTable products={[makeProduct()]} onEdit={() => {}} />,
    );
    expect(screen.getByText("Asset 1")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows discount badge", () => {
    render(
      <ProductTable
        products={[makeProduct({ discountPercent: 15 })]}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("shows inactive badge", () => {
    render(
      <ProductTable
        products={[makeProduct({ isActive: false })]}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("calls onEdit when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const product = makeProduct();
    render(<ProductTable products={[product]} onEdit={onEdit} />);
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(product);
  });
});
