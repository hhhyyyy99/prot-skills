import { useReducer, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { toastReducer, type ToastPayload } from "../lib/toastQueue";
import { ToastContext } from "../hooks/useToast";
import { ToastViewport } from "../components/patterns/ToastViewport";

function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { queue: [], max: 3 });
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "dismiss", id });
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback((payload: Omit<ToastPayload, "id">) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    dispatch({ type: "enqueue", payload: { ...payload, id } });
    const duration = payload.durationMs ?? 4000;
    if (duration !== 0) {
      const timer = setTimeout(() => {
        dispatch({ type: "timeout", id });
        timers.current.delete(id);
      }, duration);
      timers.current.set(id, timer);
    }
    return id;
  }, []);

  const ctx = useMemo(
    () => ({ toasts: state.queue, toast, dismiss }),
    [state.queue, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export { ToastProvider };
