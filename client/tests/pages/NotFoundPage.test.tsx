import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../helpers";
import NotFoundPage from "../../src/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 404", () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders page not found message", () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders back to home button", () => {
    renderWithRouter(<NotFoundPage />);
    expect(
      screen.getByRole("button", { name: "Back to Home" }),
    ).toBeInTheDocument();
  });
});
