import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../../../src/components/ui/Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <Pagination page={1} total={5} limit={10} onPageChange={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders Previous and Next buttons", () => {
    render(
      <Pagination page={1} total={30} limit={10} onPageChange={() => {}} />,
    );
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("disables Previous on first page", () => {
    render(
      <Pagination page={1} total={30} limit={10} onPageChange={() => {}} />,
    );
    expect(screen.getByText("Previous")).toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(
      <Pagination page={3} total={30} limit={10} onPageChange={() => {}} />,
    );
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("shows current page and total", () => {
    render(
      <Pagination page={2} total={30} limit={10} onPageChange={() => {}} />,
    );
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("calls onPageChange with next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={1} total={30} limit={10} onPageChange={onPageChange} />,
    );
    await user.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with previous page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} total={30} limit={10} onPageChange={onPageChange} />,
    );
    await user.click(screen.getByText("Previous"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
