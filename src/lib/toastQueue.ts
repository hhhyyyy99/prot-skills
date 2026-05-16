export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastPayload {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastState {
  queue: readonly ToastPayload[];
  max: 3;
}

export type ToastEvent =
  | { type: "enqueue"; payload: ToastPayload }
  | { type: "dismiss"; id: string }
  | { type: "timeout"; id: string };

export function toastReducer(state: ToastState, event: ToastEvent): ToastState {
  switch (event.type) {
    case "enqueue": {
      const queue = [...state.queue, event.payload];
      while (queue.length > state.max) queue.shift();
      return { ...state, queue };
    }
    case "dismiss":
    case "timeout": {
      const queue = state.queue.filter((t) => t.id !== event.id);
      return { ...state, queue };
    }
  }
}
