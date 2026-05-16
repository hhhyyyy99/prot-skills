import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { MOTION, DURATIONS, EASINGS } from "@/lib/motion";

describe("motion constants", () => {
  // Property: all MOTION values are CSS var() references
  it("all MOTION values are var() references", () => {
    fc.assert(
      fc.property(fc.constantFrom(...(Object.keys(MOTION) as (keyof typeof MOTION)[])), (key) => {
        return MOTION[key].startsWith("var(--");
      }),
    );
  });

  // Property: all DURATIONS values are var() references
  it("all DURATIONS values are var() references", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...(Object.keys(DURATIONS) as (keyof typeof DURATIONS)[])),
        (key) => {
          return DURATIONS[key].startsWith("var(--dur-");
        },
      ),
    );
  });

  // Property: all EASINGS values are var() references
  it("all EASINGS values are var() references", () => {
    fc.assert(
      fc.property(fc.constantFrom(...(Object.keys(EASINGS) as (keyof typeof EASINGS)[])), (key) => {
        return EASINGS[key].startsWith("var(--ease-");
      }),
    );
  });

  // Example: specific values
  it("MOTION.fast equals var(--dur-fast)", () => {
    expect(MOTION.fast).toBe("var(--dur-fast)");
  });

  it("EASINGS.outQuart equals var(--ease-out-quart)", () => {
    expect(EASINGS.outQuart).toBe("var(--ease-out-quart)");
  });
});
