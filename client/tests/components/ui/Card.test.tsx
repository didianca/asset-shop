import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "../../../src/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Card className="p-6"><p>Padded</p></Card>);
    const card = screen.getByText("Padded").parentElement;
    expect(card?.className).toContain("p-6");
  });
});
