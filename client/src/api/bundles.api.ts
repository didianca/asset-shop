import apiClient from "./client";
import type {
  BundleResponse,
  CreateBundleBody,
  UpdateBundleBody,
} from "../types/api";

export function getBundles() {
  return apiClient.get<BundleResponse[]>("/bundles");
}

export function getBundle(id: string) {
  return apiClient.get<BundleResponse>(`/bundles/${id}`);
}

export function createBundle(body: CreateBundleBody) {
  return apiClient.post<BundleResponse>("/bundles", body);
}

export function updateBundle(id: string, body: UpdateBundleBody) {
  return apiClient.put<BundleResponse>(`/bundles/${id}`, body);
}
