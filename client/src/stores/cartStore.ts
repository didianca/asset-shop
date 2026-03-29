import { create } from "zustand";
import * as cartApi from "../api/cart.api";
import type { CartItemResponse } from "../types/api";

interface CartState {
  items: CartItemResponse[];
  total: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItems: (productIds: string[]) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await cartApi.getCart();
      set({ items: data.items, total: data.total });
    } catch {
      // Cart may not exist yet — that's fine
    } finally {
      set({ isLoading: false });
    }
  },

  addItems: async (productIds) => {
    const { data } = await cartApi.addCartItems(productIds);
    set({ items: data.items, total: data.total });
  },

  removeItem: async (productId) => {
    const { data } = await cartApi.removeCartItem(productId);
    set({ items: data.items, total: data.total });
  },

  clearCart: async () => {
    const { data } = await cartApi.clearCart();
    set({ items: data.items, total: data.total });
  },

  reset: () => set({ items: [], total: 0, isLoading: false }),
}));
