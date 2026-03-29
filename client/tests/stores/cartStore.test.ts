import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCartStore } from "../../src/stores/cartStore";

vi.mock("../../src/api/cart.api", () => ({
  getCart: vi.fn().mockResolvedValue({
    data: {
      id: "cart-1",
      items: [
        {
          productId: "p1",
          name: "Asset 1",
          slug: "asset-1",
          price: 10,
          discountPercent: null,
          previewUrl: "https://example.com/1.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 10,
    },
  }),
  addCartItems: vi.fn().mockResolvedValue({
    data: {
      id: "cart-1",
      items: [
        {
          productId: "p1",
          name: "Asset 1",
          slug: "asset-1",
          price: 10,
          discountPercent: null,
          previewUrl: "https://example.com/1.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
        {
          productId: "p2",
          name: "Asset 2",
          slug: "asset-2",
          price: 20,
          discountPercent: 10,
          previewUrl: "https://example.com/2.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 28,
    },
  }),
  removeCartItem: vi.fn().mockResolvedValue({
    data: { id: "cart-1", items: [], total: 0 },
  }),
  clearCart: vi.fn().mockResolvedValue({
    data: { id: "cart-1", items: [], total: 0 },
  }),
}));

function resetStore() {
  useCartStore.setState({
    items: [],
    total: 0,
    isLoading: false,
  });
}

describe("cartStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("starts empty", () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.total).toBe(0);
  });

  it("fetchCart populates items and total", async () => {
    await useCartStore.getState().fetchCart();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.total).toBe(10);
  });

  it("addItems updates items and total", async () => {
    await useCartStore.getState().addItems(["p2"]);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.total).toBe(28);
  });

  it("removeItem clears items", async () => {
    await useCartStore.getState().fetchCart();
    await useCartStore.getState().removeItem("p1");
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.total).toBe(0);
  });

  it("clearCart empties the cart", async () => {
    await useCartStore.getState().fetchCart();
    await useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.total).toBe(0);
  });

  it("reset clears state without API call", () => {
    useCartStore.setState({ items: [{ productId: "p1" } as never], total: 10 });
    useCartStore.getState().reset();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });
});
