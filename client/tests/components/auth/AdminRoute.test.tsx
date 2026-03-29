import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "../../../src/stores/authStore";
import AdminRoute from "../../../src/components/auth/AdminRoute";

function renderWithRole(role: "admin" | "customer") {
  useAuthStore.setState({
    isAuthenticated: true,
    token: "tok",
    user: { id: "u1", role, status: "active" },
  });

  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it("renders children when user is admin", () => {
    renderWithRole("admin");
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("redirects to home when user is not admin", () => {
    renderWithRole("customer");
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });
});
