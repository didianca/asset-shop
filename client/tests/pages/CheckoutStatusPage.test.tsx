import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import CheckoutStatusPage from "../../src/pages/CheckoutStatusPage";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}));

describe("CheckoutStatusPage", () => {
  it("shows Payment Failed when no client secret", async () => {
    renderWithRouter(<CheckoutStatusPage />, {
      initialEntries: ["/checkout/status"],
    });
    expect(
      await screen.findByText("Payment Failed"),
    ).toBeInTheDocument();
  });

  it("shows Payment Failed when stripe is not configured", async () => {
    renderWithRouter(<CheckoutStatusPage />, {
      initialEntries: [
        "/checkout/status?payment_intent_client_secret=pi_test_secret",
      ],
    });
    expect(
      await screen.findByText("Payment Failed"),
    ).toBeInTheDocument();
  });

  it("shows Back to Cart button on failure", async () => {
    renderWithRouter(<CheckoutStatusPage />, {
      initialEntries: ["/checkout/status"],
    });
    expect(
      await screen.findByRole("button", { name: "Back to Cart" }),
    ).toBeInTheDocument();
  });
});
