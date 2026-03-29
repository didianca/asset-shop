import { describe, it, expect, vi, beforeEach } from "vitest";
import * as productsApi from "../../src/api/products.api";
import apiClient from "../../src/api/client";

vi.spyOn(apiClient, "get").mockResolvedValue({ data: [] });
vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "put").mockResolvedValue({ data: {} });

describe("products.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProducts calls GET /products", async () => {
    await productsApi.getProducts();
    expect(apiClient.get).toHaveBeenCalledWith("/products");
  });

  it("getProduct calls GET /products/:id", async () => {
    await productsApi.getProduct("p1");
    expect(apiClient.get).toHaveBeenCalledWith("/products/p1");
  });

  it("getTags calls GET /products/tags", async () => {
    await productsApi.getTags();
    expect(apiClient.get).toHaveBeenCalledWith("/products/tags");
  });

  it("createProduct calls POST /products with body", async () => {
    const body = {
      name: "New",
      slug: "new",
      price: 10,
      previewUrl: "https://example.com/p.jpg",
      assetUrl: "https://example.com/a.zip",
    };
    await productsApi.createProduct(body);
    expect(apiClient.post).toHaveBeenCalledWith("/products", body);
  });

  it("updateProduct calls PUT /products/:id with body", async () => {
    const body = {
      name: "Updated",
      slug: "updated",
      description: null,
      price: 15,
      discountPercent: null,
      isActive: true,
      tags: [],
      previewUrl: "https://example.com/p.jpg",
      assetUrl: "https://example.com/a.zip",
    };
    await productsApi.updateProduct("p1", body);
    expect(apiClient.put).toHaveBeenCalledWith("/products/p1", body);
  });
});
