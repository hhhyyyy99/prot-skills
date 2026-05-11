export type Breakpoint = 'narrow' | 'compact' | 'regular';

export function classifyWidth(px: number): Breakpoint {
  if (px < 800) return 'narrow';
  if (px < 1024) return 'compact';
  return 'regular';
}
