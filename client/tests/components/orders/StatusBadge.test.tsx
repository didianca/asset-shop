import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../../../src/components/orders/StatusBadge";

describe("StatusBadge", () => {
  it("renders pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders paid status with correct color", () => {
    render(<StatusBadge status="paid" />);
    const badge = screen.getByText("Paid");
    expect(badge.className).toContain("bg-blue-100");
  });

  it("renders fulfilled status", () => {
    render(<StatusBadge status="fulfilled" />);
    const badge = screen.getByText("Fulfilled");
    expect(badge.className).toContain("bg-green-100");
  });

  it("renders refunded status", () => {
    render(<StatusBadge status="refunded" />);
    const badge = screen.getByText("Refunded");
    expect(badge.className).toContain("bg-red-100");
  });
});
