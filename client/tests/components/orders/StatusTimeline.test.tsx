import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusTimeline from "../../../src/components/orders/StatusTimeline";
import type { StatusHistoryEntry } from "../../../src/types/api";

const makeHistory = (): StatusHistoryEntry[] => [
  {
    id: "h1",
    status: "pending",
    note: null,
    changedBy: null,
    createdAt: "2026-01-01T10:00:00Z",
  },
  {
    id: "h2",
    status: "paid",
    note: "Payment received",
    changedBy: "admin-1",
    createdAt: "2026-01-01T11:00:00Z",
  },
];

describe("StatusTimeline", () => {
  it("renders all status entries", () => {
    render(<StatusTimeline history={makeHistory()} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders notes", () => {
    render(<StatusTimeline history={makeHistory()} />);
    expect(screen.getByText("Payment received")).toBeInTheDocument();
  });

  it("renders timestamps", () => {
    render(<StatusTimeline history={makeHistory()} />);
    // At least 2 date strings should be present
    const timeElements = screen.getAllByText(/2026/);
    expect(timeElements.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts entries chronologically", () => {
    const reversed = [...makeHistory()].reverse();
    render(<StatusTimeline history={reversed} />);
    const labels = screen.getAllByText(/Pending|Paid/);
    expect(labels[0].textContent).toBe("Pending");
    expect(labels[1].textContent).toBe("Paid");
  });
});
