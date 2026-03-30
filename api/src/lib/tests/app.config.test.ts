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
});
