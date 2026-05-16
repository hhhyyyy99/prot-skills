import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { toastReducer, type ToastState, type ToastPayload } from "@/lib/toastQueue";

const emptyState: ToastState = { queue: [], max: 3 };

function makeToast(id: string): ToastPayload {
  return { id, variant: "info", title: `Toast ${id}` };
}

const toastArb = fc.string({ minLength: 1, maxLength: 10 }).map((id) => makeToast(id));

describe("toastReducer", () => {
  // Property: queue length never exceeds max (3)
  it("queue length never exceeds 3", () => {
    fc.assert(
      fc.property(fc.array(toastArb, { minLength: 1, maxLength: 10 }), (toasts) => {
        let state = emptyState;
        for (const t of toasts) {
          state = toastReducer(state, { type: "enqueue", payload: t });
        }
        return state.queue.length <= 3;
      }),
    );
  });

  // Property: dismiss is idempotent
  it("dismiss is idempotent", () => {
    fc.assert(
      fc.property(toastArb, (toast) => {
        let state = toastReducer(emptyState, { type: "enqueue", payload: toast });
        state = toastReducer(state, { type: "dismiss", id: toast.id });
        const state2 = toastReducer(state, { type: "dismiss", id: toast.id });
        return state.queue.length === state2.queue.length;
      }),
    );
  });

  // Property: FIFO order — enqueue preserves insertion order
  it("maintains FIFO order", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.nat(100).map((n) => makeToast(`t${n}`)),
          { minLength: 1, maxLength: 6 },
        ),
        (toasts) => {
          let state = emptyState;
          for (const t of toasts) {
            state = toastReducer(state, { type: "enqueue", payload: t });
          }
          // The last items should be the most recent
          const expected = toasts.slice(-3);
          return (
            state.queue.length === expected.length &&
            state.queue.every((t, i) => t.id === expected[i].id)
          );
        },
      ),
    );
  });

  // Example: enqueue 4 items, first is evicted
  it("evicts oldest when exceeding max", () => {
    let state = emptyState;
    state = toastReducer(state, { type: "enqueue", payload: makeToast("a") });
    state = toastReducer(state, { type: "enqueue", payload: makeToast("b") });
    state = toastReducer(state, { type: "enqueue", payload: makeToast("c") });
    state = toastReducer(state, { type: "enqueue", payload: makeToast("d") });
    expect(state.queue).toHaveLength(3);
    expect(state.queue[0].id).toBe("b");
  });

  // Example: timeout removes by id
  it("timeout removes the specified toast", () => {
    let state = emptyState;
    state = toastReducer(state, { type: "enqueue", payload: makeToast("x") });
    state = toastReducer(state, { type: "timeout", id: "x" });
    expect(state.queue).toHaveLength(0);
  });
});
