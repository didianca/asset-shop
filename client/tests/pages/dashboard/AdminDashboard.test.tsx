import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../../helpers";
import AdminDashboard from "../../../src/pages/dashboard/AdminDashboard";

describe("AdminDashboard", () => {
  it("renders admin dashboard heading", () => {
    renderWithRouter(<AdminDashboard />);
    expect(
      screen.getByRole("heading", { name: "Admin Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders products card", () => {
    renderWithRouter(<AdminDashboard />);
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(
      screen.getByText("Manage products, pricing, and tags"),
    ).toBeInTheDocument();
  });

  it("renders orders card", () => {
    renderWithRouter(<AdminDashboard />);
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage customer orders"),
    ).toBeInTheDocument();
  });
});
