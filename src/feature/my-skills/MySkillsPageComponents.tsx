import { FolderOpen, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Switch } from "@/components/primitives/Switch";
import { TextField } from "@/components/primitives/TextField";
import { ToolIcon } from "@/components/primitives/ToolIcon";
import { EmptyState } from "@/components/patterns/EmptyState";
import { FilterPills } from "@/components/patterns/FilterPills";
import { InlineError } from "@/components/patterns/InlineError";
import { ListRow } from "@/components/patterns/ListRow";
import type { AITool, Skill } from "@/types";
import type { TFunction } from "./mySkillsUtils";
import type { BulkSyncProgress, BulkSyncSummary, LinkFilter } from "./mySkillsTypes";

const SKELETON_ROW_IDS = Array.from({ length: 8 }, (_, index) => `skeleton-${index}`);

interface BulkSyncActionProps {
  syncing: boolean;
  disabled: boolean;
  confirmOpen: boolean;
  onOpenConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  t: TFunction;
}

export function BulkSyncAction({
  syncing,
  disabled,
  confirmOpen,
  onOpenConfirm,
  onCancel,
  onConfirm,
  t,
}: BulkSyncActionProps) {
  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        loading={syncing}
        onClick={onOpenConfirm}
        disabled={disabled}
      >
        {t("mySkills.bulkSync.action")}
      </Button>
      {confirmOpen && !syncing && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 rounded-lg border border-border-subtle bg-surface p-3 shadow-overlay">
          <p className="text-12 font-semibold text-text-primary">
            {t("mySkills.bulkSync.confirmTitle")}
          </p>
          <p className="mt-1 text-12 text-text-tertiary">{t("mySkills.bulkSync.confirmBody")}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={onConfirm}>
              {t("mySkills.bulkSync.confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BulkSyncProgressCardProps {
  progress: BulkSyncProgress | null;
  t: TFunction;
}

export function BulkSyncProgressCard({ progress, t }: BulkSyncProgressCardProps) {
  if (!progress) return null;

  return (
    <div className="compact-card mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-13 font-semibold text-text-primary">
            {t("mySkills.bulkSync.progress", { total: progress.total })}
          </p>
          <p className="mt-1 truncate text-12 text-text-tertiary">
            {progress.currentSkillName
              ? t("mySkills.bulkSync.progressCurrent", {
                  name: progress.currentSkillName,
                })
              : t("mySkills.bulkSync.progressPreparing")}
          </p>
        </div>
        <span className="shrink-0 text-12 font-semibold text-text-secondary">
          {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-label={t("mySkills.bulkSync.progressAria")}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
          style={{
            width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

interface BulkSyncSummaryCardProps {
  summary: BulkSyncSummary | null;
  syncing: boolean;
  t: TFunction;
}

export function BulkSyncSummaryCard({ summary, syncing, t }: BulkSyncSummaryCardProps) {
  if (!summary || syncing) return null;

  return (
    <div className="compact-card mb-4">
      <p className="text-13 font-semibold text-text-primary">{t("mySkills.bulkSync.complete")}</p>
      <p className="mt-1 text-12 text-text-tertiary">
        {summary.fail === 0
          ? t("mySkills.bulkSync.completeSummary", { success: summary.success })
          : t("mySkills.bulkSync.completeSummaryWithFailures", {
              success: summary.success,
              failed: summary.fail,
            })}
      </p>
      {summary.failureDescription && (
        <p className="mt-1 text-12 text-text-tertiary">{summary.failureDescription}</p>
      )}
    </div>
  );
}

interface LinkedToolIconsProps {
  skill: Skill;
  linkedTools: AITool[];
  t: TFunction;
}

export function LinkedToolIcons({ skill, linkedTools, t }: LinkedToolIconsProps) {
  if (linkedTools.length === 0) return null;

  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={t("mySkills.aria.linkedTools", { name: skill.name })}
    >
      {linkedTools.slice(0, 4).map((tool) => (
        <ToolIcon key={tool.id} tool={tool} size="sm" />
      ))}
      {linkedTools.length > 4 && (
        <span className="text-12 text-text-tertiary">+{linkedTools.length - 4}</span>
      )}
    </span>
  );
}

interface MySkillsListBodyProps {
  error: string | null;
  loading: boolean;
  skills: Skill[];
  visible: Skill[];
  uninstallIssuesBySkill: Record<string, string>;
  renderSkillSubtitle: (skill: Skill) => React.ReactNode;
  getLinkedTools: (skillId: string) => AITool[];
  onRetry: () => void;
  onClearFilters: () => void;
  onOpenFolder: (skill: Skill) => void;
  onOpenUninstallDialog: (skillId: string) => void;
  onOpenSyncDialog: (skillId: string) => void;
  t: TFunction;
}

export function MySkillsListBody({
  error,
  loading,
  skills,
  visible,
  uninstallIssuesBySkill,
  renderSkillSubtitle,
  getLinkedTools,
  onRetry,
  onClearFilters,
  onOpenFolder,
  onOpenUninstallDialog,
  onOpenSyncDialog,
  t,
}: MySkillsListBodyProps) {
  if (error) {
    return (
      <div className="compact-card">
        <InlineError title={t("mySkills.error.load")} details={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading && !skills.length) {
    return (
      <ul>
        {SKELETON_ROW_IDS.map((id) => (
          <ListRow key={id} id={id} primary="" loading />
        ))}
      </ul>
    );
  }

  if (!loading && skills.length === 0) {
    return (
      <div className="compact-card">
        <EmptyState
          title={t("mySkills.empty.installed")}
          description={t("mySkills.empty.installed.description")}
        />
      </div>
    );
  }

  if (!loading && skills.length > 0 && visible.length === 0) {
    return (
      <div className="compact-card">
        <EmptyState
          title={t("mySkills.empty.matches")}
          description={t("mySkills.empty.matches.description")}
          primaryAction={{
            label: t("mySkills.empty.matches.clear"),
            onClick: onClearFilters,
          }}
        />
      </div>
    );
  }

  return (
    <ul role="rowgroup">
      {visible.map((skill) => (
        <li key={skill.id}>
          <ListRow
            id={skill.id}
            primary={<span className="text-14 text-text-primary">{skill.name}</span>}
            secondary={renderSkillSubtitle(skill)}
            meta={[
              uninstallIssuesBySkill[skill.id] ? (
                <Badge key="uninstall-issue" variant="danger">
                  {t("mySkills.uninstallIssue")}
                </Badge>
              ) : null,
              <span key="linked-tools" className="flex items-center">
                <LinkedToolIcons skill={skill} linkedTools={getLinkedTools(skill.id)} t={t} />
              </span>,
            ].filter(Boolean)}
            trailing={
              <span className="flex items-center gap-2">
                <IconButton
                  icon={<FolderOpen size={16} />}
                  aria-label={t("mySkills.aria.openFolder", { name: skill.name })}
                  variant="subtle"
                  size="sm"
                  onClick={() => onOpenFolder(skill)}
                />
                <IconButton
                  icon={<Trash2 size={15} />}
                  aria-label={t("mySkills.aria.uninstall", { name: skill.name })}
                  title={t("mySkills.uninstall")}
                  variant="subtle"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => onOpenUninstallDialog(skill.id)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenSyncDialog(skill.id)}
                  aria-label={t("mySkills.aria.syncTargets", { name: skill.name })}
                >
                  {t("mySkills.syncTargets")}
                </Button>
              </span>
            }
          />
          {uninstallIssuesBySkill[skill.id] && (
            <p className="ml-4 mt-[-6px] pb-2 text-12 text-danger">
              {uninstallIssuesBySkill[skill.id]}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

interface SyncTargetsDialogProps {
  syncSkill: Skill | null;
  modalTools: AITool[];
  linkFilter: LinkFilter;
  toolQuery: string;
  enabledToolsCount: number;
  isToolLinked: (skillId: string, toolId: string) => boolean;
  isLinkedToAllEnabledTools: (skillId: string) => boolean;
  hasAnyLinkedEnabledTools: (skillId: string) => boolean;
  onClose: () => void;
  onLinkFilterChange: (filter: LinkFilter) => void;
  onToolQueryChange: (query: string) => void;
  onSetAllToolLinks: (skill: Skill, active: boolean) => void;
  onToggleToolLink: (skill: Skill, tool: AITool, active: boolean) => void;
  t: TFunction;
}

export function SyncTargetsDialog({
  syncSkill,
  modalTools,
  linkFilter,
  toolQuery,
  enabledToolsCount,
  isToolLinked,
  isLinkedToAllEnabledTools,
  hasAnyLinkedEnabledTools,
  onClose,
  onLinkFilterChange,
  onToolQueryChange,
  onSetAllToolLinks,
  onToggleToolLink,
  t,
}: SyncTargetsDialogProps) {
  if (!syncSkill) return null;

  const filterOptions = [
    { value: "all", label: t("mySkills.sync.allTools") },
    { value: "linked", label: t("mySkills.sync.linked") },
    { value: "unlinked", label: t("mySkills.sync.unlinked") },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("mySkills.sync.title", { name: syncSkill.name })}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section className="flex max-h-[calc(100vh-56px)] w-[min(860px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-overlay">
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
          <div>
            <h2 className="text-16 font-bold text-text-primary">
              {t("mySkills.sync.title", { name: syncSkill.name })}
            </h2>
            <p className="mt-1 text-12 text-text-tertiary">{t("mySkills.sync.subtitle")}</p>
          </div>
          <IconButton icon={<X size={16} />} aria-label={t("common.close")} onClick={onClose} />
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-raised/70 p-4">
          <FilterPills
            options={filterOptions}
            value={linkFilter}
            onChange={(value) => onLinkFilterChange(value as LinkFilter)}
            ariaLabel={t("mySkills.sync.allTools")}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSetAllToolLinks(syncSkill, true)}
              disabled={enabledToolsCount === 0 || isLinkedToAllEnabledTools(syncSkill.id)}
            >
              {t("mySkills.sync.linkAll")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetAllToolLinks(syncSkill, false)}
              disabled={!hasAnyLinkedEnabledTools(syncSkill.id)}
            >
              {t("mySkills.sync.unlinkAll")}
            </Button>
            <div className="w-[240px] max-w-full">
              <TextField
                type="search"
                size="sm"
                leadingIcon={<Search size={14} />}
                value={toolQuery}
                onChange={onToolQueryChange}
                placeholder={t("mySkills.sync.searchTools")}
              />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <section>
            <div className="mb-2 flex items-center justify-between text-11 font-semibold uppercase tracking-[0.07em] text-text-tertiary">
              <span>{t("mySkills.sync.enabledTools")}</span>
              <span>{t("mySkills.sync.totalTools", { count: modalTools.length })}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
              {modalTools.length > 0 ? (
                modalTools.map((tool) => {
                  const linked = isToolLinked(syncSkill.id, tool.id);
                  return (
                    <div
                      key={tool.id}
                      className="grid min-h-[58px] grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-border-subtle px-3 py-2 first:border-t-0"
                    >
                      <ToolIcon tool={tool} size="md" />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-13 font-semibold text-text-primary">
                            {tool.name}
                          </span>
                          {linked && <Badge variant="success">{t("mySkills.sync.linked")}</Badge>}
                        </span>
                        <span className="block truncate text-12 text-text-tertiary">
                          {tool.config_path}/{tool.skills_subdir}/{syncSkill.id}
                        </span>
                      </span>
                      <Switch
                        checked={linked}
                        onChange={(next) => onToggleToolLink(syncSkill, tool, next)}
                        aria-label={t("mySkills.aria.linkTool", {
                          skill: syncSkill.name,
                          tool: tool.name,
                        })}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-13 text-text-tertiary">
                  {t("mySkills.empty.matches")}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

interface UninstallConfirmDialogProps {
  target: Skill | null;
  onClose: () => void;
  onConfirm: () => void;
  t: TFunction;
}

export function UninstallConfirmDialog({
  target,
  onClose,
  onConfirm,
  t,
}: UninstallConfirmDialogProps) {
  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={t("mySkills.uninstallDialog.title")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section className="w-[min(420px,calc(100vw-48px))] rounded-lg border border-border-subtle bg-surface p-5 shadow-overlay">
        <h2 className="text-16 font-bold text-text-primary">
          {t("mySkills.uninstallDialog.title")}
        </h2>
        <p className="mt-2 text-13 text-text-secondary">
          {t("mySkills.uninstallDialog.body", { name: target.name })}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {t("mySkills.uninstall")}
          </Button>
        </div>
      </section>
    </div>
  );
}

interface DescriptionTooltipProps {
  tooltip: { text: string; x: number; y: number } | null;
}

export function DescriptionTooltip({ tooltip }: DescriptionTooltipProps) {
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-64 rounded-md bg-text-primary px-2 py-1 text-12 text-canvas shadow-md leading-relaxed"
      style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
    >
      {tooltip.text}
    </div>
  );
}
