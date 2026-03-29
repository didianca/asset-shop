import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import VerifyEmailPage from "../../src/pages/VerifyEmailPage";
import * as authApi from "../../src/api/auth.api";

vi.mock("../../src/api/auth.api", () => ({
  verifyEmail: vi.fn(),
}));

describe("VerifyEmailPage", () => {
  it("renders heading", () => {
    vi.mocked(authApi.verifyEmail).mockReturnValue(new Promise(() => {}));
    renderWithRouter(<VerifyEmailPage />, {
      initialEntries: ["/verify-email?token=abc"],
    });
    expect(screen.getByText("Email Verification")).toBeInTheDocument();
  });

  it("shows error when no token is provided", async () => {
    renderWithRouter(<VerifyEmailPage />, {
      initialEntries: ["/verify-email"],
    });
    expect(
      await screen.findByText("No verification token provided."),
    ).toBeInTheDocument();
  });

  it("shows success message on valid token", async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
      data: { message: "Email verified successfully" },
    } as never);
    renderWithRouter(<VerifyEmailPage />, {
      initialEntries: ["/verify-email?token=valid-token"],
    });
    expect(
      await screen.findByText("Email verified successfully"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to Login" }),
    ).toBeInTheDocument();
  });

  it("shows error message on failed verification", async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValueOnce({
      response: { data: { message: "Token expired" } },
    });
    renderWithRouter(<VerifyEmailPage />, {
      initialEntries: ["/verify-email?token=expired-token"],
    });
    expect(await screen.findByText("Token expired")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Register Again" }),
    ).toBeInTheDocument();
  });
});
