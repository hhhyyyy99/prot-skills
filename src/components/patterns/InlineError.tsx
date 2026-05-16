import { AlertCircle } from "lucide-react";
import { Button } from "../primitives/Button";
import { useI18n } from "../../shell/LanguageProvider";

export interface InlineErrorProps {
  title: string;
  details?: string;
  onRetry?: () => void;
}

export function InlineError({ title, details, onRetry }: InlineErrorProps) {
  const { t } = useI18n();

  return (
    <div
      role="alert"
      className="border border-danger rounded-md p-3 text-13 text-danger flex items-start gap-3"
    >
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              {t("common.retry")}
            </Button>
          )}
        </div>
        {details && (
          <details>
            <summary className="cursor-pointer text-12">{t("inlineError.viewDetails")}</summary>
            <pre className="font-mono text-12 whitespace-pre-wrap mt-1">{details}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
