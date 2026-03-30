import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../helpers";
import { useAuthStore } from "../../../src/stores/authStore";
import { useCartStore } from "../../../src/stores/cartStore";
import LoginForm from "../../../src/components/auth/LoginForm";
import * as authApi from "../../../src/api/auth.api";

const VALID_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(
    JSON.stringify({
      id: "u2",
      role: "customer",
      status: "active",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ) +
  ".signature";

vi.mock("../../../src/api/auth.api", () => ({
  login: vi.fn(),
}));

vi.mock("../../../src/api/cart.api", () => ({
  getCart: vi.fn().mockResolvedValue({
    data: {
      id: "cart-2",
      items: [
        {
          productId: "p2",
          name: "New User Asset",
          slug: "new-user-asset",
          price: 20,
          discountPercent: null,
          previewUrl: "https://example.com/2.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 20,
    },
  }),
  addCartItems: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
}));

async function submitLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "new@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");
  await user.click(screen.getByRole("button", { name: "Login" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    useCartStore.setState({ items: [], total: 0, isLoading: false });
  });

  it("clears previous user cart on login", async () => {
    useCartStore.setState({
      items: [
        {
          productId: "p1",
          name: "Stale Asset",
          slug: "stale-asset",
          price: 10,
          discountPercent: null,
          previewUrl: "https://example.com/1.jpg",
          addedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 10,
    });

    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { token: VALID_TOKEN },
    } as never);

    renderWithRouter(<LoginForm />);
    await submitLogin();

    await waitFor(() => {
      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe("New User Asset");
      expect(state.total).toBe(20);
    });
  });

  it("calls auth API with form values", async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { token: VALID_TOKEN },
    } as never);

    renderWithRouter(<LoginForm />);
    await submitLogin();

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });
    });
  });

  it("shows error on failed login", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });

    renderWithRouter(<LoginForm />);
    await submitLogin();

    expect(
      await screen.findByText("Invalid credentials"),
    ).toBeInTheDocument();
  });

  it("shows generic error when no message in response", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: { data: {} },
    });

    renderWithRouter(<LoginForm />);
    await submitLogin();

    expect(await screen.findByText("Login failed")).toBeInTheDocument();
  });
});
