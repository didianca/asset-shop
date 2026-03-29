import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "../../../src/stores/authStore";
import ProtectedRoute from "../../../src/components/auth/ProtectedRoute";

function renderWithAuth(isAuthenticated: boolean, path = "/protected") {
  useAuthStore.setState({
    isAuthenticated,
    token: isAuthenticated ? "tok" : null,
    user: isAuthenticated
      ? { id: "u1", role: "customer", status: "active" }
      : null,
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it("renders children when authenticated", () => {
    renderWithAuth(true);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    renderWithAuth(false);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });
});
