import apiClient from "./client";
import type { RegisterBody, LoginBody } from "../types/api";

export function register(body: RegisterBody) {
  return apiClient.post<{ message: string }>("/auth/register", body);
}

export function login(body: LoginBody) {
  return apiClient.post<{ token: string }>("/auth/login", body);
}

export function verifyEmail(token: string) {
  return apiClient.get<{ message: string }>("/auth/verify", {
    params: { token },
  });
}
