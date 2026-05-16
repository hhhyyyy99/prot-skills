import { useEffect, useRef } from "react";

const PASSTHROUGH_IN_INPUT = new Set(["escape", "mod+k"]);

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

function normalizeEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (isMac() ? e.metaKey : e.ctrlKey) parts.push("mod");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  const key = e.key.toLowerCase();
  if (!["meta", "control", "shift", "alt"].includes(key)) parts.push(key);
  return parts.join("+");
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(map: Record<string, (e: KeyboardEvent) => void>): void {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const combo = normalizeEvent(e);
      const fn = mapRef.current[combo];
      if (!fn) return;

      if (isEditableElement(document.activeElement)) {
        if (!PASSTHROUGH_IN_INPUT.has(combo)) return;
      }

      e.preventDefault();
      fn(e);
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
