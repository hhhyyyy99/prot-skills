import { useState, useEffect } from "react";
import { classifyWidth, type Breakpoint } from "../lib/breakpoint";

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "regular";
    return classifyWidth(window.innerWidth);
  });

  useEffect(() => {
    const handler = () => setBp(classifyWidth(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
}
