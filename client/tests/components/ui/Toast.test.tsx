import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToastContainer from "../../../src/components/ui/Toast";
import { useUiStore } from "../../../src/stores/uiStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useUiStore.setState({ toasts: [] });
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders toast messages", () => {
    useUiStore.setState({
      toasts: [
        { id: "1", message: "Success!", type: "success" },
        { id: "2", message: "Error!", type: "error" },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("applies correct styling per type", () => {
    useUiStore.setState({
      toasts: [{ id: "1", message: "Info", type: "info" }],
    });
    render(<ToastContainer />);
    const toast = screen.getByText("Info").closest("div");
    expect(toast?.className).toContain("bg-blue-50");
  });

  it("removes a toast when close button is clicked", async () => {
    const user = userEvent.setup();
    useUiStore.setState({
      toasts: [{ id: "1", message: "Dismiss me", type: "success" }],
    });
    render(<ToastContainer />);
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
