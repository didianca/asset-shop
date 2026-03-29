import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "../../../src/components/ui/Input";

describe("Input", () => {
  it("renders with a label", () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("displays an error message", () => {
    render(<Input id="email" label="Email" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("applies error styling when error is present", () => {
    render(<Input id="email" label="Email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input.className).toContain("border-red-500");
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input id="name" label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "John");
    expect(input).toHaveValue("John");
  });
});
