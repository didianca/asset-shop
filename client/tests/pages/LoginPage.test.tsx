import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import LoginPage from "../../src/pages/LoginPage";

describe("LoginPage", () => {
  it("renders login heading", () => {
    renderWithRouter(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Login" }),
    ).toBeInTheDocument();
  });

  it("renders email and password inputs", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders login button", () => {
    renderWithRouter(<LoginPage />);
    expect(
      screen.getByRole("button", { name: "Login" }),
    ).toBeInTheDocument();
  });

  it("renders link to register", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText("Register")).toBeInTheDocument();
  });
});
