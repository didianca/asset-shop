import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../helpers";
import RegisterPage from "../../src/pages/RegisterPage";
import * as authApi from "../../src/api/auth.api";

vi.mock("../../src/api/auth.api", () => ({
  register: vi.fn(),
}));

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

  it("navigates to login on successful registration", async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      data: { message: "Registration successful" },
    } as never);

    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />, { initialEntries: ["/register"] });

    await user.type(screen.getByLabelText("First Name"), "John");
    await user.type(screen.getByLabelText("Last Name"), "Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
      });
    });
  });

  it("shows error message on failed registration", async () => {
    vi.mocked(authApi.register).mockRejectedValueOnce({
      response: { data: { message: "Email already taken" } },
    });

    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText("First Name"), "John");
    await user.type(screen.getByLabelText("Last Name"), "Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Email already taken")).toBeInTheDocument();
  });

  it("shows field-level validation errors", async () => {
    vi.mocked(authApi.register).mockRejectedValueOnce({
      response: {
        data: {
          message: "Validation failed",
          errors: { email: ["Invalid email format"] },
        },
      },
    });

    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText("First Name"), "John");
    await user.type(screen.getByLabelText("Last Name"), "Doe");
    await user.type(screen.getByLabelText("Email"), "bad@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText("Invalid email format"),
    ).toBeInTheDocument();
  });
});
