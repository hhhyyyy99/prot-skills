import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyWidth, type Breakpoint } from './breakpoint';

const order: Record<Breakpoint, number> = { narrow: 0, compact: 1, regular: 2 };

describe('classifyWidth', () => {
  // Property: monotonic — larger width never yields a lower classification
  it('is monotonic', () => {
    fc.assert(
      fc.property(
        fc.nat(5000),
        fc.nat(5000),
        (a, b) => {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          return order[classifyWidth(lo)] <= order[classifyWidth(hi)];
        }
      )
    );
  });

  // Property: result is always one of the three valid values
  it('always returns a valid breakpoint', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (px) => {
        const r = classifyWidth(px);
        return r === 'narrow' || r === 'compact' || r === 'regular';
      })
    );
  });

  // Property: values below 800 are always narrow
  it('values < 800 are narrow', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 799 }), (px) => {
        return classifyWidth(px) === 'narrow';
      })
    );
  });

  // Example: exact boundaries
  it('799 → narrow, 800 → compact', () => {
    expect(classifyWidth(799)).toBe('narrow');
    expect(classifyWidth(800)).toBe('compact');
  });

  it('1023 → compact, 1024 → regular', () => {
    expect(classifyWidth(1023)).toBe('compact');
    expect(classifyWidth(1024)).toBe('regular');
  });
});
