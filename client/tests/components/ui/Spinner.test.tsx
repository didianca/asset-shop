import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Spinner from "../../../src/components/ui/Spinner";

describe("Spinner", () => {
  it("renders with role status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Spinner className="h-10 w-10" />);
    const spinner = screen.getByRole("status");
    expect(spinner.className).toContain("h-10");
    expect(spinner.className).toContain("w-10");
  });
});
