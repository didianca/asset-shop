import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../../helpers";
import { useAuthStore } from "../../../src/stores/authStore";
import { useCartStore } from "../../../src/stores/cartStore";
import Header from "../../../src/components/layout/Header";

const VALID_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(
    JSON.stringify({
      id: "u1",
      role: "customer",
      status: "active",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ) +
  ".signature";

function loginUser(role: "customer" | "admin" = "customer") {
  useAuthStore.setState({
    token: VALID_TOKEN,
    user: { id: "u1", role, status: "active" },
    isAuthenticated: true,
  });
}

function seedCart() {
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
    isLoading: false,
  });
}

describe("Header", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    useCartStore.setState({ items: [], total: 0, isLoading: false });
  });

  it("shows login and register when not authenticated", () => {
    renderWithRouter(<Header />);
    expect(
      screen.getByRole("button", { name: "Login" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Register" }),
    ).toBeInTheDocument();
  });

  it("shows logout when authenticated", () => {
    loginUser();
    renderWithRouter(<Header />);
    expect(
      screen.getByRole("button", { name: "Logout" }),
    ).toBeInTheDocument();
  });

  it("shows cart badge when items exist", () => {
    loginUser();
    seedCart();
    renderWithRouter(<Header />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows admin link for admin users", () => {
    loginUser("admin");
    renderWithRouter(<Header />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not show admin link for customer users", () => {
    loginUser("customer");
    renderWithRouter(<Header />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("clears cart on logout", async () => {
    loginUser();
    seedCart();
    renderWithRouter(<Header />);

    expect(useCartStore.getState().items).toHaveLength(1);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
  });

  it("clears auth on logout", async () => {
    loginUser();
    renderWithRouter(<Header />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
