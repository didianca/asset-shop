import { describe, it, expect, vi } from "vitest";
import { resolveKeysFromSlug } from "../utils.js";

const mockFindKeyByPrefix = vi.hoisted(() => vi.fn());

vi.mock("../../upload/s3.js", () => ({
  getPublicUrl: vi.fn((key: string) => `https://test-bucket.s3.us-east-1.amazonaws.com/${key}`),
  findKeyByPrefix: mockFindKeyByPrefix,
}));

describe("resolveKeysFromSlug", () => {
  it("returns preview and asset keys when both are found in S3", async () => {
    mockFindKeyByPrefix
      .mockResolvedValueOnce("previews/my-product.jpg")
      .mockResolvedValueOnce("assets/my-product.zip");

    const result = await resolveKeysFromSlug("my-product");

    expect(result).toEqual({
      previewKey: "previews/my-product.jpg",
      assetKey: "assets/my-product.zip",
    });
  });

  it("returns null when preview key is not found", async () => {
    mockFindKeyByPrefix
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("assets/my-product.zip");

    const result = await resolveKeysFromSlug("my-product");

    expect(result).toBeNull();
  });

  it("returns null when asset key is not found", async () => {
    mockFindKeyByPrefix
      .mockResolvedValueOnce("previews/my-product.jpg")
      .mockResolvedValueOnce(null);

    const result = await resolveKeysFromSlug("my-product");

    expect(result).toBeNull();
  });
});
