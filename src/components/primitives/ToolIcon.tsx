import { useMemo, useState } from "react";
import type { AITool } from "../../types";
import { getToolInitial, resolveToolIcon } from "../../lib/toolIcons";

interface ToolIconProps {
  tool: Pick<AITool, "id" | "name">;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASS = {
  sm: {
    wrapper: "h-7 w-7 rounded-md",
    image: "h-4 w-4",
    text: "text-[11px]",
  },
  md: {
    wrapper: "h-8 w-8 rounded-lg",
    image: "h-5 w-5",
    text: "text-12",
  },
} as const;

function ToolIcon({ tool, size = "md", className = "" }: ToolIconProps) {
  const [failed, setFailed] = useState(false);
  const resolved = useMemo(() => resolveToolIcon(tool), [tool]);
  const icon = !failed ? resolved : null;
  const sizeClass = SIZE_CLASS[size];

  return (
    <span
      className={[
        "inline-flex items-center justify-center border border-border-subtle bg-surface-raised text-text-secondary shadow-card",
        sizeClass.wrapper,
        sizeClass.text,
        className,
      ].join(" ")}
      aria-label={tool.name}
      title={tool.name}
    >
      {icon ? (
        <img
          src={icon.src}
          alt=""
          className={[
            sizeClass.image,
            "object-contain",
            icon.invertInDark ? "dark:invert dark:brightness-0 dark:contrast-200" : "",
          ].join(" ")}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-bold">{getToolInitial(tool)}</span>
      )}
    </span>
  );
}

export { ToolIcon };
