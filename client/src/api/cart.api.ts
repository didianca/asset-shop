import apiClient from "./client";
import type { CartResponse } from "../types/api";

export function getCart() {
  return apiClient.get<CartResponse>("/cart");
}

export function addCartItems(productIds: string[]) {
  return apiClient.post<CartResponse>("/cart/items", { productIds });
}

export function removeCartItem(productId: string) {
  return apiClient.delete<CartResponse>(`/cart/items/${productId}`);
}

export function clearCart() {
  return apiClient.delete<CartResponse>("/cart");
}
