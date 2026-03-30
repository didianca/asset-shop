import { describe, it, expect, vi, beforeEach } from "vitest";

describe("appConfig", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns APP_URL when set", async () => {
    vi.stubEnv("APP_URL", "http://localhost:5173");
    const { appConfig } = await import("../app.config.js");
    expect(appConfig.corsOrigin).toBe("http://localhost:5173");
    vi.unstubAllEnvs();
  });

  it("returns false when APP_URL is not set", async () => {
    const saved = process.env.APP_URL;
    delete process.env.APP_URL;
    const { appConfig } = await import("../app.config.js");
    expect(appConfig.corsOrigin).toBe(false);
    if (saved !== undefined) process.env.APP_URL = saved;
  });

  it("returns S3 origin URL when S3_BUCKET_NAME and AWS_S3_REGION are set", async () => {
    vi.stubEnv("S3_BUCKET_NAME", "my-bucket");
    vi.stubEnv("AWS_S3_REGION", "us-east-1");
    const { appConfig } = await import("../app.config.js");
    expect(appConfig.s3Origin).toBe("https://my-bucket.s3.us-east-1.amazonaws.com");
    vi.unstubAllEnvs();
  });

  it("returns undefined when S3 env vars are not set", async () => {
    const savedBucket = process.env.S3_BUCKET_NAME;
    const savedRegion = process.env.AWS_S3_REGION;
    delete process.env.S3_BUCKET_NAME;
    delete process.env.AWS_S3_REGION;
    const { appConfig } = await import("../app.config.js");
    expect(appConfig.s3Origin).toBeUndefined();
    if (savedBucket !== undefined) process.env.S3_BUCKET_NAME = savedBucket;
    if (savedRegion !== undefined) process.env.AWS_S3_REGION = savedRegion;
  });
});
