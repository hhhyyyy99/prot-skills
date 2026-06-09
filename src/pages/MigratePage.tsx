import { useRef, useState, type ReactNode } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import { Badge } from "../components/primitives/Badge";
import { Button } from "../components/primitives/Button";
import { FilterPills } from "../components/patterns/FilterPills";
import { StatsStrip } from "../components/patterns/StatsStrip";
import { middleEllipsis } from "../lib/truncate";
import { WorkspaceHeader } from "../shell/WorkspaceHeader";
import {
  DescriptionTooltip,
  MigrationAffectedPathsPreview,
  MigrationBatchActionBar,
  MigrationEmptyStateCard,
  MigrationLoadingState,
  MigrationProgressCard,
  MigrationScanErrors,
  MigrationSkillList,
  MigrationSummaryCard,
  SyncIssueDialog,
} from "./migrate/MigrationPageComponents";
import { ALL_TOOLS_FILTER } from "./migrate/migrationTypes";
import { useMigrationWorkflow } from "./migrate/useMigrationWorkflow";
import type { LocalSkill } from "../types";

export function MigratePage() {
  const {
    t,
    allTools,
    scanning,
    scanResults,
    filter,
    setFilter,
    selected,
    setSelected,
    migrating,
    progress,
    rowStatus,
    preflightByPath,
    migrationSummary,
    syncIssueDialogOpen,
    setSyncIssueDialogOpen,
    hasScannedOnce,
    detectedTools,
    filteredSkills,
    totalSkillCount,
    toolsWithSkills,
    syncIssuePreview,
    syncIssueItems,
    filterOptions,
    smartScan,
    scanSingle,
    handleScanAction,
    toggleSelected,
    toggleAll,
    migrateSelected,
    retry,
    canRetry,
    isBlocked,
    getErrorMsg,
  } = useMigrationWorkflow();

  const [descTooltip, setDescTooltip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  const descTimerRef = useRef<number>(0);

  const renderSkillSubtitle = (skill: LocalSkill) => {
    const description = skill.metadata?.description?.trim();
    const version = skill.metadata?.version;
    const errorMsg = getErrorMsg(skill);

    const descLine = description ? (
      <span
        className="block text-12 text-text-tertiary truncate"
        onMouseEnter={(event) => {
          descTimerRef.current = window.setTimeout(() => {
            setDescTooltip({ text: description, x: event.clientX, y: event.clientY });
          }, 1000);
        }}
        onMouseMove={(event) => {
          if (descTooltip) {
            setDescTooltip((prev) =>
              prev ? { ...prev, x: event.clientX, y: event.clientY } : null,
            );
          }
        }}
        onMouseLeave={() => {
          clearTimeout(descTimerRef.current);
          setDescTooltip(null);
        }}
      >
        {description}
      </span>
    ) : null;

    const versionLine = version ? (
      <span className="text-12 text-text-tertiary truncate">{version}</span>
    ) : null;

    const errorLine = errorMsg ? (
      <span className="text-12 text-text-danger truncate">{errorMsg}</span>
    ) : null;

    if (!descLine && !versionLine && !errorLine) return undefined;
    return (
      <span className="flex flex-col">
        {descLine}
        {versionLine}
        {errorLine}
      </span>
    );
  };

  const renderSkillMeta = (skill: LocalSkill, includeSource: boolean) =>
    [
      <code key="p" className="font-mono text-12 text-text-secondary">
        {middleEllipsis(skill.path, 48)}
      </code>,
      includeSource && skill.tool_name ? (
        <Badge key="tool" variant="accent">
          {t("migrate.badge.source", { name: skill.tool_name })}
        </Badge>
      ) : null,
      skill.is_symlink ? (
        <Badge key="sym" variant="warning">
          {t("migrate.badge.symlink")}
        </Badge>
      ) : null,
      ...(skill.scan_warnings ?? []).map((warning) => (
        <Badge key={`warning-${warning.code}`} variant="warning">
          {t(`migrate.warning.${warning.code}`)}
        </Badge>
      )),
      rowStatus[skill.path] === "success" ? (
        <Badge key="ok" variant="success">
          {t("migrate.badge.done")}
        </Badge>
      ) : null,
      rowStatus[skill.path] === "error" ? (
        <Badge key="err" variant="danger">
          {t("migrate.badge.failed")}
        </Badge>
      ) : null,
      isBlocked(skill) ? (
        <Badge key="blocked" variant="danger">
          {t("migrate.badge.blocked")}
        </Badge>
      ) : null,
    ].filter(Boolean) as ReactNode[];

  return (
    <>
      <WorkspaceHeader
        title={t("nav.migrate")}
        meta={
          hasScannedOnce
            ? t("migrate.meta.found", { count: totalSkillCount, tools: toolsWithSkills.length })
            : t("migrate.meta.scanning")
        }
        primaryActions={[
          <Button
            key="rescan"
            variant="primary"
            size="sm"
            leadingIcon={<RefreshCw size={14} />}
            loading={scanning}
            disabled={migrating}
            onClick={() => smartScan(allTools)}
          >
            {t("migrate.rescanAll")}
          </Button>,
        ]}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: t("migrate.stats.found"), value: totalSkillCount, accent: true },
            { label: t("migrate.stats.tools"), value: toolsWithSkills.length },
            { label: t("migrate.stats.selected"), value: selected.size },
          ]}
        />

        <div className="compact-card mb-4">
          <p className="text-13 text-text-secondary">{t("migrate.safetyCopy")}</p>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-12 font-medium text-text-tertiary">
            <Filter size={14} />
            <span>{t("migrate.filter.label")}</span>
          </div>
          <FilterPills
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            ariaLabel={t("migrate.filter.aria")}
          />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Search size={14} />}
            loading={scanning}
            disabled={detectedTools.length === 0 || migrating}
            onClick={handleScanAction}
          >
            {filter === ALL_TOOLS_FILTER && detectedTools.length !== 1
              ? t("migrate.scanAll")
              : t("migrate.scan")}
          </Button>
          {detectedTools.length === 0 && (
            <span className="text-13 text-text-tertiary">{t("migrate.noTools")}</span>
          )}
        </div>

        <MigrationScanErrors
          scanResults={scanResults}
          migrating={migrating}
          onScanSingle={scanSingle}
          t={t}
        />

        <MigrationBatchActionBar
          selectedCount={selected.size}
          totalCount={filteredSkills.length}
          migrating={migrating}
          onToggleAll={toggleAll}
          onMigrateSelected={migrateSelected}
          onClearSelected={() => setSelected(new Set())}
          t={t}
        />

        <MigrationAffectedPathsPreview
          selected={selected}
          filteredSkills={filteredSkills}
          preflightByPath={preflightByPath}
          t={t}
        />

        <MigrationSummaryCard
          migrationSummary={migrationSummary}
          syncIssuePreview={syncIssuePreview}
          onViewSyncIssues={() => setSyncIssueDialogOpen(true)}
          t={t}
        />

        <MigrationProgressCard progress={progress} t={t} />

        <MigrationLoadingState scanning={scanning} hasScannedOnce={hasScannedOnce} t={t} />

        <MigrationEmptyStateCard
          scanning={scanning}
          hasScannedOnce={hasScannedOnce}
          filteredCount={filteredSkills.length}
          filter={filter}
          allToolsFilter={ALL_TOOLS_FILTER}
          onScan={handleScanAction}
          t={t}
        />

        <MigrationSkillList
          filteredSkills={filteredSkills}
          filter={filter}
          allToolsFilter={ALL_TOOLS_FILTER}
          toolsWithSkills={toolsWithSkills}
          selected={selected}
          migrating={migrating}
          renderSkillSubtitle={renderSkillSubtitle}
          renderSkillMeta={renderSkillMeta}
          canRetry={canRetry}
          isBlocked={isBlocked}
          onToggleSelected={toggleSelected}
          onRetry={retry}
          onScanSingle={scanSingle}
          t={t}
        />
      </main>
      <SyncIssueDialog
        open={syncIssueDialogOpen}
        migrationSummary={migrationSummary}
        syncIssueItems={syncIssueItems}
        onClose={() => setSyncIssueDialogOpen(false)}
        t={t}
      />
      <DescriptionTooltip tooltip={descTooltip} />
    </>
  );
}
