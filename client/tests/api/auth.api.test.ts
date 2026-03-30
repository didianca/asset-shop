import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authApi from "../../src/api/auth.api";
import apiClient from "../../src/api/client";

vi.spyOn(apiClient, "post").mockResolvedValue({ data: {} });
vi.spyOn(apiClient, "get").mockResolvedValue({ data: {} });

describe("auth.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("calls POST /auth/register with the body", async () => {
      const body = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };
      await authApi.register(body);
      expect(apiClient.post).toHaveBeenCalledWith("/auth/register", body);
    });
  });

  describe("login", () => {
    it("calls POST /auth/login with the body", async () => {
      const body = { email: "test@example.com", password: "password123" };
      await authApi.login(body);
      expect(apiClient.post).toHaveBeenCalledWith("/auth/login", body);
    });
  });

  describe("verifyEmail", () => {
    it("calls GET /auth/verify with token param", async () => {
      await authApi.verifyEmail("abc123");
      expect(apiClient.get).toHaveBeenCalledWith("/auth/verify", {
        params: { token: "abc123" },
        signal: undefined,
      });
    });

    it("forwards abort signal to the request", async () => {
      const controller = new AbortController();
      await authApi.verifyEmail("abc123", controller.signal);
      expect(apiClient.get).toHaveBeenCalledWith("/auth/verify", {
        params: { token: "abc123" },
        signal: controller.signal,
      });
    });
  });
});
