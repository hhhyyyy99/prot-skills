interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  shape?: 'rect' | 'line';
  className?: string;
}

function Skeleton({ width = '100%', height = 12, shape = 'rect', className }: SkeletonProps) {
  const h = shape === 'line' ? '1em' : height;

  return (
    <div
      className={['bg-border-subtle rounded-sm skeleton-pulse', className].filter(Boolean).join(' ')}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof h === 'number' ? `${h}px` : h,
      }}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
