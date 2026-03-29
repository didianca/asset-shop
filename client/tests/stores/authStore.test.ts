import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../../src/stores/authStore";

// A valid JWT with payload: { id: "user-1", role: "customer", status: "active", exp: 9999999999 }
const VALID_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(
    JSON.stringify({
      id: "user-1",
      role: "customer",
      status: "active",
      exp: 9999999999,
    }),
  ) +
  ".signature";

// A JWT that is already expired
const EXPIRED_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(
    JSON.stringify({
      id: "user-1",
      role: "customer",
      status: "active",
      exp: 1000000000,
    }),
  ) +
  ".signature";

const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(
    JSON.stringify({
      id: "admin-1",
      role: "admin",
      status: "active",
      exp: 9999999999,
    }),
  ) +
  ".signature";

function resetStore() {
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
  });
}

describe("authStore", () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
  });

  describe("login", () => {
    it("sets token, user, and isAuthenticated on valid token", () => {
      useAuthStore.getState().login(VALID_TOKEN);

      const state = useAuthStore.getState();
      expect(state.token).toBe(VALID_TOKEN);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({
        id: "user-1",
        role: "customer",
        status: "active",
        exp: 9999999999,
      });
    });

    it("stores token in localStorage", () => {
      useAuthStore.getState().login(VALID_TOKEN);
      expect(localStorage.getItem("token")).toBe(VALID_TOKEN);
    });

    it("decodes admin role correctly", () => {
      useAuthStore.getState().login(ADMIN_TOKEN);
      expect(useAuthStore.getState().user?.role).toBe("admin");
    });

    it("does not set state for an invalid token", () => {
      useAuthStore.getState().login("garbage");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("clears token, user, and isAuthenticated", () => {
      useAuthStore.getState().login(VALID_TOKEN);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("removes token from localStorage", () => {
      useAuthStore.getState().login(VALID_TOKEN);
      useAuthStore.getState().logout();
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  describe("initialize", () => {
    it("hydrates from localStorage when token is valid", () => {
      localStorage.setItem("token", VALID_TOKEN);
      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe("user-1");
    });

    it("clears state when token is expired", () => {
      localStorage.setItem("token", EXPIRED_TOKEN);
      useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("does nothing when localStorage is empty", () => {
      useAuthStore.getState().initialize();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("clears state when token is malformed", () => {
      localStorage.setItem("token", "not-a-jwt");
      useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem("token")).toBeNull();
    });
  });
});
