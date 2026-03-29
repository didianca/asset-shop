import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagFilter from "../../../src/components/products/TagFilter";

describe("TagFilter", () => {
  it("renders nothing when no tags", () => {
    const { container } = render(
      <TagFilter tags={[]} selectedTags={[]} onToggleTag={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders tag buttons", () => {
    render(
      <TagFilter
        tags={["dark", "minimalist"]}
        selectedTags={[]}
        onToggleTag={() => {}}
      />,
    );
    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(screen.getByText("minimalist")).toBeInTheDocument();
  });

  it("highlights selected tags", () => {
    render(
      <TagFilter
        tags={["dark", "minimalist"]}
        selectedTags={["dark"]}
        onToggleTag={() => {}}
      />,
    );
    const darkBtn = screen.getByText("dark");
    expect(darkBtn.className).toContain("bg-indigo-600");
  });

  it("calls onToggleTag when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TagFilter
        tags={["dark"]}
        selectedTags={[]}
        onToggleTag={onToggle}
      />,
    );
    await user.click(screen.getByText("dark"));
    expect(onToggle).toHaveBeenCalledWith("dark");
  });
});
