import { ArrowRight, RefreshCw, Search, X } from "lucide-react";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Checkbox } from "@/components/primitives/Checkbox";
import { IconButton } from "@/components/primitives/IconButton";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ListRow } from "@/components/patterns/ListRow";
import { middleEllipsis } from "@/lib/truncate";
import type { LocalSkill, MigrationPreflight } from "@/types";
import type { SyncIssueItem } from "./migrationUtils";
import type { MigrationBatchSummary, MigrationProgress, ScanResult } from "./migrationTypes";

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface MigrationScanErrorsProps {
  scanResults: ScanResult[];
  migrating: boolean;
  onScanSingle: (toolId: string) => void;
  t: TFunction;
}

export function MigrationScanErrors({
  scanResults,
  migrating,
  onScanSingle,
  t,
}: MigrationScanErrorsProps) {
  return (
    <>
      {scanResults
        .filter((result) => result.error)
        .map((result) => (
          <div
            key={result.toolId}
            className="mb-2 px-3 py-2 rounded-md bg-danger/10 border border-danger/20 text-13 text-danger flex items-center gap-2"
          >
            <span className="font-medium">{result.toolName}:</span>
            <span>{result.error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onScanSingle(result.toolId)}
              className="ml-auto"
              disabled={migrating}
            >
              {t("common.retry")}
            </Button>
          </div>
        ))}
    </>
  );
}

interface MigrationBatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  migrating: boolean;
  onToggleAll: () => void;
  onMigrateSelected: () => void;
  onClearSelected: () => void;
  t: TFunction;
}

export function MigrationBatchActionBar({
  selectedCount,
  totalCount,
  migrating,
  onToggleAll,
  onMigrateSelected,
  onClearSelected,
  t,
}: MigrationBatchActionBarProps) {
  if (totalCount === 0) return null;

  return (
    <div className="bottom-action-bar mb-4 mt-0 rounded-lg border border-border-subtle bg-surface">
      <Checkbox
        checked={
          selectedCount === totalCount ? true : selectedCount === 0 ? false : "indeterminate"
        }
        onChange={onToggleAll}
        label={t("migrate.selectAll")}
        disabled={migrating}
      />
      <span className="text-13 text-text-secondary">
        {selectedCount > 0
          ? t("migrate.selectedOfTotal", {
              selected: selectedCount,
              total: totalCount,
            })
          : t("migrate.skillCount", { count: totalCount })}
      </span>
      {selectedCount > 0 && (
        <div className="ml-auto flex gap-2">
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<ArrowRight size={14} />}
            loading={migrating}
            onClick={onMigrateSelected}
          >
            {t("migrate.migrateSelected", { count: selectedCount })}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelected} disabled={migrating}>
            {t("common.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}

interface MigrationAffectedPathsPreviewProps {
  selected: Set<string>;
  filteredSkills: LocalSkill[];
  preflightByPath: Record<string, MigrationPreflight>;
  t: TFunction;
}

export function MigrationAffectedPathsPreview({
  selected,
  filteredSkills,
  preflightByPath,
  t,
}: MigrationAffectedPathsPreviewProps) {
  if (selected.size === 0) return null;

  return (
    <div className="compact-card mb-4">
      <p className="text-12 font-semibold text-text-primary">{t("migrate.affectedPaths")}</p>
      <ul className="mt-2 space-y-1">
        {filteredSkills
          .filter((skill) => selected.has(skill.path))
          .slice(0, 4)
          .map((skill) => {
            const preflight = preflightByPath[skill.path];
            const target = preflight?.managed_target_path;
            return (
              <li key={skill.path} className="text-12 text-text-tertiary">
                <span className="font-medium text-text-secondary">{skill.name}</span>
                <span className="mx-1">-</span>
                <code className="font-mono">{middleEllipsis(skill.path, 36)}</code>
                {target && (
                  <>
                    <span className="mx-1">to</span>
                    <code className="font-mono">{middleEllipsis(target, 36)}</code>
                  </>
                )}
              </li>
            );
          })}
      </ul>
      {selected.size > 4 && (
        <p className="mt-2 text-12 text-text-tertiary">
          {t("migrate.affectedPathsMore", { count: selected.size - 4 })}
        </p>
      )}
    </div>
  );
}

interface MigrationSummaryCardProps {
  migrationSummary: MigrationBatchSummary | null;
  syncIssuePreview?: string;
  onViewSyncIssues: () => void;
  t: TFunction;
}

export function MigrationSummaryCard({
  migrationSummary,
  syncIssuePreview,
  onViewSyncIssues,
  t,
}: MigrationSummaryCardProps) {
  if (!migrationSummary) return null;

  return (
    <div className="compact-card mb-4">
      <p className="text-13 font-semibold text-text-primary">{t("migrate.summary.title")}</p>
      <p className="mt-1 text-12 text-text-tertiary">
        {t("migrate.summary.body", {
          success: migrationSummary.success,
          fail: migrationSummary.fail,
          skipped: migrationSummary.skipped,
        })}
      </p>
      {syncIssuePreview && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-12 text-warning">
          <span>{t("migrate.summary.syncIssues", { issue: syncIssuePreview })}</span>
          {migrationSummary.syncIssues.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-warning hover:bg-warning-bg"
              onClick={onViewSyncIssues}
            >
              {t("migrate.syncIssue.viewAll", { count: migrationSummary.syncIssues.length })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface MigrationProgressCardProps {
  progress: MigrationProgress | null;
  t: TFunction;
}

export function MigrationProgressCard({ progress, t }: MigrationProgressCardProps) {
  if (!progress) return null;

  return (
    <div className="compact-card mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-13 font-semibold text-text-primary">
            {t("migrate.progress", { done: progress.done, total: progress.total })}
          </p>
          <p className="mt-1 truncate text-12 text-text-tertiary">
            {progress.currentSkillName
              ? t("migrate.progress.current", { name: progress.currentSkillName })
              : t("migrate.progress.preparing")}
          </p>
        </div>
        <span className="shrink-0 text-12 font-semibold text-text-secondary">
          {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-label={t("migrate.progress.aria")}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
          style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface MigrationLoadingStateProps {
  scanning: boolean;
  hasScannedOnce: boolean;
  t: TFunction;
}

export function MigrationLoadingState({ scanning, hasScannedOnce, t }: MigrationLoadingStateProps) {
  if (!scanning || hasScannedOnce) return null;

  return (
    <div className="compact-card flex flex-col items-center justify-center gap-3 py-12">
      <RefreshCw size={24} className="text-text-tertiary animate-spin" />
      <p className="text-14 text-text-secondary">{t("migrate.scanningAll")}</p>
    </div>
  );
}

interface MigrationEmptyStateCardProps {
  scanning: boolean;
  hasScannedOnce: boolean;
  filteredCount: number;
  filter: string;
  allToolsFilter: string;
  onScan: () => void;
  t: TFunction;
}

export function MigrationEmptyStateCard({
  scanning,
  hasScannedOnce,
  filteredCount,
  filter,
  allToolsFilter,
  onScan,
  t,
}: MigrationEmptyStateCardProps) {
  if (scanning || !hasScannedOnce || filteredCount > 0) return null;

  return (
    <div className="compact-card">
      <EmptyState
        title={filter === allToolsFilter ? t("migrate.empty.title") : t("migrate.empty.title.tool")}
        description={filter === allToolsFilter ? t("migrate.empty.all") : t("migrate.empty.tool")}
        primaryAction={{ label: t("migrate.rescan"), onClick: onScan }}
      />
    </div>
  );
}

interface MigrationSkillListProps {
  filteredSkills: LocalSkill[];
  filter: string;
  allToolsFilter: string;
  toolsWithSkills: ScanResult[];
  selected: Set<string>;
  migrating: boolean;
  renderSkillSubtitle: (skill: LocalSkill) => React.ReactNode;
  renderSkillMeta: (skill: LocalSkill, includeSource: boolean) => React.ReactNode[];
  canRetry: (skill: LocalSkill) => boolean;
  isBlocked: (skill: LocalSkill) => boolean;
  onToggleSelected: (path: string) => void;
  onRetry: (path: string) => void;
  onScanSingle: (toolId: string) => void;
  t: TFunction;
}

function MigrationSkillRow({
  skill,
  includeSource,
  selected,
  migrating,
  renderSkillSubtitle,
  renderSkillMeta,
  canRetry,
  isBlocked,
  onToggleSelected,
  onRetry,
  t,
}: {
  skill: LocalSkill;
  includeSource: boolean;
  selected: boolean;
  migrating: boolean;
  renderSkillSubtitle: (skill: LocalSkill) => React.ReactNode;
  renderSkillMeta: (skill: LocalSkill, includeSource: boolean) => React.ReactNode[];
  canRetry: (skill: LocalSkill) => boolean;
  isBlocked: (skill: LocalSkill) => boolean;
  onToggleSelected: (path: string) => void;
  onRetry: (path: string) => void;
  t: TFunction;
}) {
  const retryable = canRetry(skill);

  return (
    <ListRow
      key={skill.path}
      id={skill.path}
      leading={
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelected(skill.path)}
          aria-label={t("migrate.aria.select", { name: skill.name })}
          disabled={migrating || isBlocked(skill)}
        />
      }
      primary={<span className="text-14 text-text-primary">{skill.name}</span>}
      secondary={renderSkillSubtitle(skill)}
      meta={renderSkillMeta(skill, includeSource)}
      trailing={
        retryable ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRetry(skill.path)}
            disabled={migrating}
          >
            {t("common.retry")}
          </Button>
        ) : undefined
      }
    />
  );
}

export function MigrationSkillList({
  filteredSkills,
  filter,
  allToolsFilter,
  toolsWithSkills,
  selected,
  migrating,
  renderSkillSubtitle,
  renderSkillMeta,
  canRetry,
  isBlocked,
  onToggleSelected,
  onRetry,
  onScanSingle,
  t,
}: MigrationSkillListProps) {
  if (filteredSkills.length === 0) return null;

  const renderRow = (skill: LocalSkill, includeSource: boolean) => (
    <MigrationSkillRow
      key={skill.path}
      skill={skill}
      includeSource={includeSource}
      selected={selected.has(skill.path)}
      migrating={migrating}
      renderSkillSubtitle={renderSkillSubtitle}
      renderSkillMeta={renderSkillMeta}
      canRetry={canRetry}
      isBlocked={isBlocked}
      onToggleSelected={onToggleSelected}
      onRetry={onRetry}
      t={t}
    />
  );

  if (filter === allToolsFilter && toolsWithSkills.length > 1) {
    return (
      <div className="space-y-6">
        {toolsWithSkills.map((result) => (
          <section key={result.toolId}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="section-kicker mb-0">
                {t("migrate.groupTitle", { name: result.toolName })}
              </h3>
              <Badge variant="accent">{result.skills.length}</Badge>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<Search size={12} />}
                onClick={() => onScanSingle(result.toolId)}
                className="ml-auto"
                disabled={migrating}
              >
                {t("migrate.rescan")}
              </Button>
            </div>
            <ul role="rowgroup">{result.skills.map((skill) => renderRow(skill, false))}</ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul role="rowgroup">
      {filteredSkills.map((skill) => renderRow(skill, filter === allToolsFilter))}
    </ul>
  );
}

interface SyncIssueDialogProps {
  open: boolean;
  migrationSummary: MigrationBatchSummary | null;
  syncIssueItems: SyncIssueItem[];
  onClose: () => void;
  t: TFunction;
}

export function SyncIssueDialog({
  open,
  migrationSummary,
  syncIssueItems,
  onClose,
  t,
}: SyncIssueDialogProps) {
  if (!open || !migrationSummary) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("migrate.syncIssue.dialog.title")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section className="flex max-h-[calc(100vh-56px)] w-[min(560px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-overlay">
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
          <div>
            <h2 className="text-16 font-bold text-text-primary">
              {t("migrate.syncIssue.dialog.title")}
            </h2>
            <p className="mt-1 text-12 text-text-tertiary">
              {t("migrate.syncIssue.dialog.subtitle", {
                count: migrationSummary.syncIssues.length,
              })}
            </p>
          </div>
          <IconButton icon={<X size={16} />} aria-label={t("common.close")} onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <ul className="space-y-2">
            {syncIssueItems.map(({ key, issue }) => (
              <li key={key} className="rounded-md border border-warning/30 bg-warning-bg px-3 py-2">
                <p className="text-13 font-semibold text-text-primary">
                  {issue.tool_name ?? issue.tool_id ?? t("migrate.syncIssue.unknownTool")}
                </p>
                <p className="mt-1 text-12 text-text-secondary">{issue.message}</p>
                {(issue.path || issue.target_path) && (
                  <code className="mt-2 block truncate font-mono text-12 text-text-tertiary">
                    {issue.path ?? issue.target_path}
                  </code>
                )}
              </li>
            ))}
          </ul>
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
