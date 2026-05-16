import { useEffect, useRef } from "react";
import { Command } from "cmdk";
import { useI18n } from "../../shell/LanguageProvider";

export interface CommandItem {
  id: string;
  label: string;
  keywords?: readonly string[];
  group: "Navigate" | "Tools" | "Skills" | "Theme";
  shortcut?: string;
  perform: () => void | Promise<void>;
}

export interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly CommandItem[];
}

const GROUPS = ["Navigate", "Tools", "Skills", "Theme"] as const;
const GROUP_LABELS: Record<CommandItem["group"], string> = {
  Navigate: "command.group.navigate",
  Tools: "command.group.tools",
  Skills: "command.group.skills",
  Theme: "command.group.theme",
};

export function CommandBar({ open, onOpenChange, commands }: CommandBarProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const grouped = GROUPS.map((g) => ({
    group: g,
    items: commands.filter((c) => c.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-canvas/60 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-label={t("command.aria")}
    >
      <div
        ref={panelRef}
        className="w-[560px] bg-surface border border-border-subtle rounded-lg shadow-overlay overflow-hidden"
      >
        <Command>
          <Command.Input
            ref={inputRef}
            placeholder={t("command.placeholder")}
            className="h-11 px-3 w-full border-b border-border-subtle bg-transparent text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <Command.List className="max-h-[320px] overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-13 text-text-secondary">
              {t("command.noResults")}
            </Command.Empty>
            {grouped.map(({ group, items }) => (
              <Command.Group key={group} heading={t(GROUP_LABELS[group])}>
                {items.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.keywords?.join(" ") ?? ""}`}
                    onSelect={() => {
                      cmd.perform();
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between h-8 px-3 rounded-sm text-13 text-text-primary data-[selected=true]:bg-surface-raised"
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-12 text-text-tertiary">{cmd.shortcut}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
