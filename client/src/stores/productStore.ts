import { create } from "zustand";
import * as productsApi from "../api/products.api";
import type { ProductResponse } from "../types/api";

interface ProductState {
  products: ProductResponse[];
  tags: string[];
  isLoading: boolean;
  fetchProducts: (params?: { includeInactive?: boolean }) => Promise<void>;
  fetchTags: () => Promise<void>;
  getBySlug: (slug: string) => ProductResponse | undefined;
  getById: (id: string) => ProductResponse | undefined;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  tags: [],
  isLoading: false,

  fetchProducts: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await productsApi.getProducts(params);
      set({ products: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTags: async () => {
    const { data } = await productsApi.getTags();
    set({ tags: data });
  },

  getBySlug: (slug) => get().products.find((p) => p.slug === slug),

  getById: (id) => get().products.find((p) => p.id === id),
}));
