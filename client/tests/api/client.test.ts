import { describe, it, expect, beforeEach } from "vitest";
import apiClient from "../../src/api/client";

type InterceptorHandler = {
  fulfilled: ((value: unknown) => unknown) | null;
  rejected: ((error: unknown) => unknown) | null;
};

const getRequestHandler = () => {
  const interceptors = apiClient.interceptors.request as unknown as {
    handlers: InterceptorHandler[];
  };
  return interceptors.handlers.find((h) => h.fulfilled)!;
};

const getResponseHandler = () => {
  const interceptors = apiClient.interceptors.response as unknown as {
    handlers: InterceptorHandler[];
  };
  return interceptors.handlers.find((h) => h.rejected)!;
};

const makeError = (status: number, url: string) => ({
  response: { status },
  config: { url },
});

describe("apiClient", () => {
  beforeEach(() => {
    // Reset location to a known state before each test
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost/" },
    });
  });

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

    const handler = getRequestHandler();
    const config = { headers: { Authorization: "" } } as unknown as Record<string, unknown>;
    const result = handler.fulfilled!(config) as { headers: { Authorization: string } };

    expect(result.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not attach Authorization header when no token", () => {
    localStorage.removeItem("token");

    const handler = getRequestHandler();
    const config = { headers: { Authorization: "" } } as unknown as Record<string, unknown>;
    const result = handler.fulfilled!(config) as { headers: { Authorization: string } };

    expect(result.headers.Authorization).toBe("");
  });

  describe("response interceptor — 401 handling", () => {
    it("redirects to /login and clears token on 401 from non-auth route", async () => {
      localStorage.setItem("token", "test-token");
      const handler = getResponseHandler();

      await expect(handler.rejected!(makeError(401, "/products"))).rejects.toBeTruthy();

      expect(localStorage.getItem("token")).toBeNull();
      expect(window.location.href).toBe("/login");
    });

    it("does not redirect on 401 from /auth/ routes", async () => {
      localStorage.setItem("token", "test-token");
      const handler = getResponseHandler();

      await expect(handler.rejected!(makeError(401, "/auth/login"))).rejects.toBeTruthy();

      expect(localStorage.getItem("token")).toBe("test-token");
      expect(window.location.href).toBe("http://localhost/");
    });

    it("does not redirect on 401 from /auth/register", async () => {
      const handler = getResponseHandler();

      await expect(handler.rejected!(makeError(401, "/auth/register"))).rejects.toBeTruthy();

      expect(window.location.href).toBe("http://localhost/");
    });

    it("does not redirect on non-401 errors", async () => {
      localStorage.setItem("token", "test-token");
      const handler = getResponseHandler();

      await expect(handler.rejected!(makeError(500, "/products"))).rejects.toBeTruthy();

      expect(localStorage.getItem("token")).toBe("test-token");
      expect(window.location.href).toBe("http://localhost/");
    });

    it("handles missing config gracefully", async () => {
      const handler = getResponseHandler();
      const error = { response: { status: 401 } };

      await expect(handler.rejected!(error)).rejects.toBeTruthy();

      expect(window.location.href).toBe("/login");
    });
  });
});
