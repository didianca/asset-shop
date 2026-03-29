import apiClient from "./client";
import type { CreatePaymentResponse, PaymentResponse } from "../types/api";

export function createPayment(orderId: string) {
  return apiClient.post<CreatePaymentResponse>("/payments", { orderId });
}

export function getPayment(orderId: string) {
  return apiClient.get<PaymentResponse>(`/payments/${orderId}`);
}
