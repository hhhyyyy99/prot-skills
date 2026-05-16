import type { ReactNode } from "react";

export interface WorkspaceBodyProps {
  children: ReactNode;
  detail?: ReactNode;
  detailOpen: boolean;
  layout: "push" | "overlay";
}

export function WorkspaceBody({ children, detail, detailOpen, layout }: WorkspaceBodyProps) {
  if (layout === "overlay") {
    return (
      <div className="workspace-body relative h-full">
        <main className="overflow-y-auto h-full">{children}</main>
        {detailOpen && <div className="absolute right-0 top-0 h-full w-[70%] z-20">{detail}</div>}
      </div>
    );
  }

  return (
    <div
      className="workspace-body grid h-full"
      style={{ gridTemplateColumns: detailOpen ? "1fr clamp(360px,40%,480px)" : "1fr 0fr" }}
    >
      <main className="overflow-y-auto h-full">{children}</main>
      <div style={{ overflow: "hidden" }}>{detail}</div>
    </div>
  );
}
