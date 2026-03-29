import { describe, it, expect, vi, beforeEach } from "vitest";
import * as cartApi from "../../src/api/cart.api";
import apiClient from "../../src/api/client";

vi.spyOn(apiClient, "get").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "delete").mockResolvedValue({ data: {} });

describe("cart.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getCart calls GET /cart", async () => {
    await cartApi.getCart();
    expect(apiClient.get).toHaveBeenCalledWith("/cart");
  });

  it("addCartItems calls POST /cart/items with productIds", async () => {
    await cartApi.addCartItems(["p1", "p2"]);
    expect(apiClient.post).toHaveBeenCalledWith("/cart/items", {
      productIds: ["p1", "p2"],
    });
  });

  it("removeCartItem calls DELETE /cart/items/:productId", async () => {
    await cartApi.removeCartItem("p1");
    expect(apiClient.delete).toHaveBeenCalledWith("/cart/items/p1");
  });

  it("clearCart calls DELETE /cart", async () => {
    await cartApi.clearCart();
    expect(apiClient.delete).toHaveBeenCalledWith("/cart");
  });
});
