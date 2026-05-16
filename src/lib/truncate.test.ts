import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { middleEllipsis } from "./truncate";

describe("middleEllipsis", () => {
  // Property: output length ≤ maxChars
  it("output length never exceeds maxChars", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (path, max) => {
          return middleEllipsis(path, max).length <= max;
        },
      ),
    );
  });

  // Property: contains '…' if and only if truncation occurred
  it("contains ellipsis iff truncated", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (path, max) => {
          const result = middleEllipsis(path, max);
          const truncated = path.length > max;
          return truncated === result.includes("…");
        },
      ),
    );
  });

  // Property: idempotent when maxChars >= path.length
  it("returns original when maxChars >= length", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (path) => {
        return middleEllipsis(path, path.length) === path;
      }),
    );
  });

  // Example assertions
  it("truncates a long path correctly", () => {
    expect(middleEllipsis("/usr/local/bin/myapp", 10)).toBe("/usr/…yapp");
  });

  it("does not truncate short path", () => {
    expect(middleEllipsis("short", 10)).toBe("short");
  });
});
