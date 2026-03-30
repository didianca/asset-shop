import apiClient from "./client";

export interface UploadResponse {
  assetKey: string;
  previewKey: string;
}

export function uploadAsset(slug: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<UploadResponse>(`/upload?slug=${encodeURIComponent(slug)}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
