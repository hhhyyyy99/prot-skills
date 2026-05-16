import { useEffect } from "react";

/**
 * Dev-only performance mark. 在首次 mount 时记录 `interactive` 标记与耗时。
 * 用于 Requirement 17.4：1440×900 下首屏可交互 ≤ 1200ms。
 * 生产构建 (`import.meta.env.DEV === false`) 时不执行任何逻辑，零成本。
 */
export function PerfMark() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof performance === "undefined") return;
    try {
      performance.mark("app-shell:interactive");
      const ms = Math.round(performance.now());
      // eslint-disable-next-line no-console
      console.info(`[perf] app-shell interactive at ${ms}ms`);
    } catch {
      // ignore
    }
  }, []);
  return null;
}
