import { useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { IconButton } from "@/components/primitives/IconButton";
import { TextField } from "@/components/primitives/TextField";
import { FilterPills } from "@/components/patterns/FilterPills";
import { StatsStrip } from "@/components/patterns/StatsStrip";
import { WorkspaceHeader } from "@/shell/WorkspaceHeader";
import {
  BulkSyncAction,
  BulkSyncProgressCard,
  BulkSyncSummaryCard,
  DescriptionTooltip,
  MySkillsListBody,
  SyncTargetsDialog,
  UninstallConfirmDialog,
} from "./MySkillsPageComponents";
import { isLocalSource } from "./mySkillsUtils";
import { useMySkillsWorkflow } from "./useMySkillsWorkflow";
import type { Skill } from "@/types";

export function MySkillsView() {
  const {
    t,
    skills,
    q,
    setQ,
    sourceType,
    setSourceType,
    loading,
    error,
    uninstallIssuesBySkill,
    syncSkill,
    uninstallTarget,
    toolQuery,
    setToolQuery,
    linkFilter,
    setLinkFilter,
    bulkSyncing,
    bulkSyncConfirmOpen,
    setBulkSyncConfirmOpen,
    bulkSyncProgress,
    bulkSyncSummary,
    visible,
    enabledCount,
    linkCount,
    enabledTools,
    sourceOptions,
    showSourceFilters,
    bulkSyncableSkills,
    modalTools,
    refresh,
    requestRefresh,
    getLinkedTools,
    isToolLinked,
    isLinkedToAllEnabledTools,
    hasAnyLinkedEnabledTools,
    handleOpenFolder,
    openUninstallDialog,
    closeUninstallDialog,
    executeUninstall,
    openSyncDialog,
    closeSyncDialog,
    toggleToolLink,
    setAllToolLinks,
    syncAllSkills,
    handleBulkSyncClick,
  } = useMySkillsWorkflow();

  const [descTooltip, setDescTooltip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  const descTimerRef = useRef<number>(0);

  const renderSkillSubtitle = (skill: Skill) => {
    const description = skill.metadata?.description?.trim();
    const subtitleParts = [
      isLocalSource(skill.source_type) ? null : skill.source_type,
      skill.metadata?.version,
    ].filter(Boolean);

    const subtitleLine =
      subtitleParts.length > 0 ? (
        <span className="text-12 text-text-tertiary truncate">{subtitleParts.join(" · ")}</span>
      ) : null;

    const descriptionLine = description ? (
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

    if (!descriptionLine && !subtitleLine) return undefined;
    return (
      <span className="flex flex-col">
        {descriptionLine}
        {subtitleLine}
      </span>
    );
  };

  return (
    <>
      <WorkspaceHeader
        title={t("nav.mySkills")}
        meta={t("mySkills.meta", {
          visible: visible.length,
          total: skills.length,
          enabled: enabledCount,
        })}
        search={
          <div className="flex items-center gap-2">
            <div className="w-[240px]">
              <TextField
                type="search"
                size="sm"
                leadingIcon={<Search size={14} />}
                value={q}
                onChange={setQ}
                placeholder={t("mySkills.searchPlaceholder")}
              />
            </div>
            <BulkSyncAction
              syncing={bulkSyncing}
              disabled={enabledTools.length === 0 || bulkSyncableSkills.length === 0}
              confirmOpen={bulkSyncConfirmOpen}
              onOpenConfirm={handleBulkSyncClick}
              onCancel={() => setBulkSyncConfirmOpen(false)}
              onConfirm={() => void syncAllSkills()}
              t={t}
            />
          </div>
        }
        primaryActions={[
          <IconButton
            key="r"
            icon={<RefreshCw size={16} />}
            aria-label={t("mySkills.refresh")}
            onClick={requestRefresh}
            variant="subtle"
            size="sm"
          />,
        ]}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: t("mySkills.stats.enabled"), value: enabledCount, accent: true },
            { label: t("mySkills.stats.links"), value: linkCount },
            { label: t("mySkills.stats.tools"), value: enabledTools.length },
          ]}
        />
        {showSourceFilters && (
          <FilterPills
            options={sourceOptions}
            value={sourceType}
            onChange={setSourceType}
            ariaLabel={t("mySkills.filters.aria")}
          />
        )}
        <BulkSyncProgressCard progress={bulkSyncProgress} t={t} />
        <BulkSyncSummaryCard summary={bulkSyncSummary} syncing={bulkSyncing} t={t} />
        <div className="section-kicker">{t("mySkills.section.all", { count: skills.length })}</div>
        <MySkillsListBody
          error={error}
          loading={loading}
          skills={skills}
          visible={visible}
          uninstallIssuesBySkill={uninstallIssuesBySkill}
          renderSkillSubtitle={renderSkillSubtitle}
          getLinkedTools={getLinkedTools}
          onRetry={refresh}
          onClearFilters={() => {
            setQ("");
            setSourceType("all");
          }}
          onOpenFolder={handleOpenFolder}
          onOpenUninstallDialog={openUninstallDialog}
          onOpenSyncDialog={openSyncDialog}
          t={t}
        />
      </main>
      <SyncTargetsDialog
        syncSkill={syncSkill}
        modalTools={modalTools}
        linkFilter={linkFilter}
        toolQuery={toolQuery}
        enabledToolsCount={enabledTools.length}
        isToolLinked={isToolLinked}
        isLinkedToAllEnabledTools={isLinkedToAllEnabledTools}
        hasAnyLinkedEnabledTools={hasAnyLinkedEnabledTools}
        onClose={closeSyncDialog}
        onLinkFilterChange={setLinkFilter}
        onToolQueryChange={setToolQuery}
        onSetAllToolLinks={setAllToolLinks}
        onToggleToolLink={toggleToolLink}
        t={t}
      />
      <UninstallConfirmDialog
        target={uninstallTarget}
        onClose={closeUninstallDialog}
        onConfirm={executeUninstall}
        t={t}
      />
      <DescriptionTooltip tooltip={descTooltip} />
    </>
  );
}
