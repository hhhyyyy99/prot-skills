import { X } from "lucide-react";
import { IconButton } from "../primitives/IconButton";
import { Button } from "../primitives/Button";
import type { ToastPayload } from "../../lib/toastQueue";

interface ToastProps extends ToastPayload {
  onDismiss: (id: string) => void;
  action?: { label: string; onClick: () => void };
}

const variantBorder: Record<string, string> = {
  info: "border-accent text-accent",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  error: "border-danger text-danger",
};

function Toast({ id, variant, title, description, action, onDismiss }: ToastProps) {
  const isAssertive = variant === "warning" || variant === "error";

  return (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      className={`relative border rounded-md p-3 min-w-[280px] max-w-[360px] bg-surface ${variantBorder[variant]}`}
    >
      <div className="pr-6">
        <p className="text-13 font-medium">{title}</p>
        {description && <p className="text-12 text-text-secondary">{description}</p>}
        {action && (
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          </div>
        )}
      </div>
      <span className="absolute top-2 right-2">
        <IconButton
          icon={<X size={14} />}
          aria-label="Dismiss"
          size="sm"
          onClick={() => onDismiss(id)}
        />
      </span>
    </div>
  );
}

export { Toast };
export type { ToastProps };
