import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useToast } from "@/hooks/useToast";
import { ToastProvider } from "@/shell/ToastProvider";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueue auto-removes after 4s default", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ variant: "info", title: "Hi" });
    });
    expect(result.current.toasts.length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toasts.length).toBe(0);
  });

  it("durationMs=0 does not auto-remove, manual dismiss works", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id: string;
    act(() => {
      id = result.current.toast({ variant: "info", title: "Sticky", durationMs: 0 });
    });
    expect(result.current.toasts.length).toBe(1);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.toasts.length).toBe(1);

    act(() => {
      result.current.dismiss(id!);
    });
    expect(result.current.toasts.length).toBe(0);
  });

  it("queue length stays <= 3 with FIFO on 4 enqueues", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ variant: "info", title: "1", durationMs: 0 });
      result.current.toast({ variant: "info", title: "2", durationMs: 0 });
      result.current.toast({ variant: "info", title: "3", durationMs: 0 });
      result.current.toast({ variant: "info", title: "4", durationMs: 0 });
    });

    expect(result.current.toasts.length).toBe(3);
    expect(result.current.toasts[0].title).toBe("2");
    expect(result.current.toasts[2].title).toBe("4");
  });
});
