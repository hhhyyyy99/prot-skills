import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "../components/primitives/IconButton";

export interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  ariaLabel,
}: DetailPanelProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(open);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen && open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    } else if (wasOpen && !open) {
      previousFocusRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, onClose]);

  return (
    <aside
      ref={asideRef}
      role="complementary"
      aria-label={ariaLabel ?? "Details"}
      data-state={open ? "open" : "closed"}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="h-full flex flex-col bg-surface border-l border-border-subtle transition-transform duration-base ease-out-quart data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
    >
      <div className="flex items-start justify-between p-4 border-b border-border-subtle">
        <div>
          <div>{title}</div>
          {subtitle && <div>{subtitle}</div>}
        </div>
        <IconButton icon={<X size={16} />} aria-label="Close" onClick={onClose} ref={closeBtnRef} />
      </div>
      <div className="panel-body flex-1 overflow-y-auto p-4">{children}</div>
      {footer && <div className="p-4 border-t border-border-subtle">{footer}</div>}
    </aside>
  );
}
