import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import RegisterPage from "../../src/pages/RegisterPage";

describe("RegisterPage", () => {
  it("renders create account heading", () => {
    renderWithRouter(<RegisterPage />);
    expect(
      screen.getByRole("heading", { name: "Create Account" }),
    ).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders register button", () => {
    renderWithRouter(<RegisterPage />);
    expect(
      screen.getByRole("button", { name: "Register" }),
    ).toBeInTheDocument();
  });

  it("renders link to login", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});
