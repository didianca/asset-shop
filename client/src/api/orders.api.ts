import apiClient from "./client";
import type {
  OrderResponse,
  OrderListResponse,
  UpdateOrderStatusBody,
  RefundRequestBody,
} from "../types/api";

export function createOrder() {
  return apiClient.post<OrderResponse>("/orders");
}

export function getOrders(params?: {
  page?: number;
  limit?: number;
  userId?: string;
}) {
  return apiClient.get<OrderListResponse>("/orders", { params });
}

export function getOrder(id: string) {
  return apiClient.get<OrderResponse>(`/orders/${id}`);
}

export function updateOrderStatus(id: string, body: UpdateOrderStatusBody) {
  return apiClient.patch<OrderResponse>(`/orders/${id}/status`, body);
}

export function requestRefund(id: string, body: RefundRequestBody) {
  return apiClient.post<OrderResponse>(`/orders/${id}/refund`, body);
}
