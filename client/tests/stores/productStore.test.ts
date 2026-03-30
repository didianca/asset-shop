import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProductStore } from "../../src/stores/productStore";

const { product1, product2 } = vi.hoisted(() => {
  const makeProduct = (overrides: Record<string, unknown>) => ({
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
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  return {
    product1: makeProduct({}),
    product2: makeProduct({
      id: "p2",
      name: "Asset 2",
      slug: "asset-2",
      description: "Second asset",
      price: 20,
      discountPercent: 15,
      tags: ["minimalist"],
      previewUrl: "https://example.com/preview2.jpg",
      assetUrl: "https://example.com/asset2.zip",
      createdAt: "2026-01-02T00:00:00Z",
    }),
  };
});

vi.mock("../../src/api/products.api", () => ({
  getProducts: vi.fn().mockResolvedValue({
    data: [product1, product2],
  }),
  getTags: vi.fn().mockResolvedValue({
    data: ["dark", "minimalist", "4K"],
  }),
}));

function resetStore() {
  useProductStore.setState({
    products: [],
    tags: [],
    isLoading: false,
  });
}

describe("productStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("starts empty", () => {
    const state = useProductStore.getState();
    expect(state.products).toEqual([]);
    expect(state.tags).toEqual([]);
  });

  it("fetchProducts populates products", async () => {
    await useProductStore.getState().fetchProducts();
    expect(useProductStore.getState().products).toHaveLength(2);
  });

  it("fetchTags populates tags", async () => {
    await useProductStore.getState().fetchTags();
    expect(useProductStore.getState().tags).toEqual([
      "dark",
      "minimalist",
      "4K",
    ]);
  });

  it("getBySlug returns the correct product", async () => {
    await useProductStore.getState().fetchProducts();
    const product = useProductStore.getState().getBySlug("asset-2");
    expect(product?.id).toBe("p2");
    expect(product?.name).toBe("Asset 2");
  });

  it("getBySlug returns undefined for unknown slug", async () => {
    await useProductStore.getState().fetchProducts();
    expect(useProductStore.getState().getBySlug("nope")).toBeUndefined();
  });

  it("getById returns the correct product", async () => {
    await useProductStore.getState().fetchProducts();
    const product = useProductStore.getState().getById("p1");
    expect(product?.slug).toBe("asset-1");
  });

  it("getById returns undefined for unknown id", async () => {
    await useProductStore.getState().fetchProducts();
    expect(useProductStore.getState().getById("nope")).toBeUndefined();
  });
});
