import { describe, it, expect, vi } from "vitest";
import { findKeyByPrefix } from "../s3.js";

const mockS3Send = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  ListObjectsV2Command: vi.fn().mockImplementation((params) => params),
}));

describe("findKeyByPrefix", () => {
  it("returns the first matching key when S3 contains a matching object", async () => {
    mockS3Send.mockResolvedValueOnce({
      Contents: [{ Key: "previews/my-product.jpg" }],
    });

    const key = await findKeyByPrefix("previews/my-product");

    expect(key).toBe("previews/my-product.jpg");
  });

  it("returns null when S3 has no matching objects", async () => {
    mockS3Send.mockResolvedValueOnce({ Contents: [] });

    const key = await findKeyByPrefix("previews/nonexistent");

    expect(key).toBeNull();
  });

  it("returns null when Contents is undefined", async () => {
    mockS3Send.mockResolvedValueOnce({});

    const key = await findKeyByPrefix("previews/empty");

    expect(key).toBeNull();
  });
});
