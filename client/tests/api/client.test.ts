import { describe, it, expect, beforeEach, vi } from "vitest";
import apiClient from "../../src/api/client";
import MockAdapter from "axios-mock-adapter";

// We need to install axios-mock-adapter — let's use msw-style inline mocking instead
// Actually let's just test the instance config and interceptor behavior directly

describe("apiClient", () => {
  it("has baseURL set to /api", () => {
    expect(apiClient.defaults.baseURL).toBe("/api");
  });

  it("has Content-Type header set to application/json", () => {
    expect(apiClient.defaults.headers["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("attaches Authorization header when token exists in localStorage", () => {
    localStorage.setItem("token", "test-token");

    // Get the request interceptor and run it manually
    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers.find((h) => h.fulfilled);
    const config = { headers: { Authorization: "" } } as unknown as Record<string, unknown>;
    const result = handler!.fulfilled(config) as { headers: { Authorization: string } };

    expect(result.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not attach Authorization header when no token", () => {
    localStorage.removeItem("token");

    const interceptors = apiClient.interceptors.request as unknown as {
      handlers: { fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }[];
    };
    const handler = interceptors.handlers.find((h) => h.fulfilled);
    const config = { headers: { Authorization: "" } } as unknown as Record<string, unknown>;
    const result = handler!.fulfilled(config) as { headers: { Authorization: string } };

    expect(result.headers.Authorization).toBe("");
  });
});
