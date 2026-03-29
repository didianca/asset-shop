import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUiStore } from "../../src/stores/uiStore";

function resetStore() {
  useUiStore.setState({ toasts: [] });
}

describe("uiStore", () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  it("starts with no toasts", () => {
    expect(useUiStore.getState().toasts).toEqual([]);
  });

  it("adds a toast", () => {
    useUiStore.getState().addToast("Hello", "success");
    const toasts = useUiStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Hello");
    expect(toasts[0].type).toBe("success");
  });

  it("removes a toast by id", () => {
    useUiStore.getState().addToast("One", "info");
    const id = useUiStore.getState().toasts[0].id;
    useUiStore.getState().removeToast(id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it("auto-removes toast after 5 seconds", () => {
    useUiStore.getState().addToast("Temp", "error");
    expect(useUiStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it("adds multiple toasts with unique ids", () => {
    useUiStore.getState().addToast("A", "success");
    useUiStore.getState().addToast("B", "error");

    const toasts = useUiStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });
});
