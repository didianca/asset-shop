import apiClient from "./client";
import type {
  ProductResponse,
  CreateProductBody,
  UpdateProductBody,
} from "../types/api";

export function getProducts() {
  return apiClient.get<ProductResponse[]>("/products");
}

export function getProduct(id: string) {
  return apiClient.get<ProductResponse>(`/products/${id}`);
}

export function getTags() {
  return apiClient.get<string[]>("/products/tags");
}

export function createProduct(body: CreateProductBody) {
  return apiClient.post<ProductResponse>("/products", body);
}

export function updateProduct(id: string, body: UpdateProductBody) {
  return apiClient.put<ProductResponse>(`/products/${id}`, body);
}
