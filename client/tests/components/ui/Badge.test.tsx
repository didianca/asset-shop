import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../../src/components/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText("Tag")).toBeInTheDocument();
  });

  it("applies default styling when no className", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-gray-100");
  });

  it("applies custom className", () => {
    render(<Badge className="bg-green-100 text-green-800">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("bg-green-100");
  });
});
