import { startTransition, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Search, ArrowRight, RefreshCw, Filter, X } from "lucide-react";
import {
  getTools,
  scanLocalSkills,
  scanAllLocalSkills,
  migrateLocalSkill,
  preflightMigrateLocalSkill,
} from "../api";
import { useToast } from "../hooks/useToast";
import { WorkspaceHeader } from "../shell/WorkspaceHeader";
import { useI18n } from "../shell/LanguageProvider";
import { Button } from "../components/primitives/Button";
import { Checkbox } from "../components/primitives/Checkbox";
import { Badge } from "../components/primitives/Badge";
import { IconButton } from "../components/primitives/IconButton";
import { ListRow } from "../components/patterns/ListRow";
import { EmptyState } from "../components/patterns/EmptyState";
import { FilterPills } from "../components/patterns/FilterPills";
import { StatsStrip } from "../components/patterns/StatsStrip";
import { middleEllipsis } from "../lib/truncate";
import type {
  AITool,
  LifecycleIssue,
  LifecycleReport,
  LocalSkill,
  MigrationPreflight,
} from "../types";

type ScanFilter = string;

const ALL_TOOLS_FILTER = "__all__";

interface ScanResult {
  toolId: string;
  toolName: string;
  skills: LocalSkill[];
  error?: string;
}

interface MigrationProgress {
  done: number;
  total: number;
  currentSkillName?: string;
}

interface MigrationBatchSummary {
  success: number;
  fail: number;
  skipped: number;
  syncIssues: LifecycleIssue[];
}

const STATUS_FLUSH_INTERVAL = 8;

const SOURCE_ACTION_TYPES = new Set([
  "copy_to_managed",
  "reuse_managed_copy",
  "replace_managed_with_newer_local",
  "replace_original_with_symlink",
]);
const SYNC_ACTION_TYPE = "sync_tool_link";

type MigrationOutcome =
  | { type: "source-completed"; syncIssues: LifecycleIssue[] }
  | { type: "source-failed"; failures: LifecycleIssue[] }
  | { type: "blocked"; failures: LifecycleIssue[] };

interface SyncIssueItem {
  key: string;
  issue: LifecycleIssue;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function getFailureDescription(failures: LifecycleIssue[]) {
  if (failures.length === 0) return undefined;
  return failures
    .slice(0, 3)
    .map((failure) => failure.message)
    .join("; ");
}

function getSyncIssueKey(issue: LifecycleIssue) {
  return `${issue.tool_id ?? issue.tool_name ?? ""}:${issue.message}`;
}

function dedupeSyncIssues(issues: LifecycleIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = getSyncIssueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listSyncIssues(issues: LifecycleIssue[]) {
  const seen = new Map<string, number>();
  return issues.map((issue): SyncIssueItem => {
    const baseKey = `${getSyncIssueKey(issue)}:${issue.path ?? issue.target_path ?? ""}`;
    const occurrence = (seen.get(baseKey) ?? 0) + 1;
    seen.set(baseKey, occurrence);
    return { key: `${baseKey}:${occurrence}`, issue };
  });
}

function classifyMigrationReport(report: LifecycleReport): MigrationOutcome {
  if (report.status === "blocked") {
    return { type: "blocked", failures: report.failures };
  }

  if (report.status === "success") {
    return { type: "source-completed", syncIssues: [] };
  }

  const failedActions = report.actions.filter((action) => action.status === "failed");
  const completedSourceAction = report.actions.some(
    (action) => SOURCE_ACTION_TYPES.has(action.action_type) && action.status === "completed",
  );
  const failedSourceOrUnknownAction = failedActions.some(
    (action) => action.action_type !== SYNC_ACTION_TYPE,
  );

  if (completedSourceAction && !failedSourceOrUnknownAction) {
    return { type: "source-completed", syncIssues: report.failures };
  }

  return { type: "source-failed", failures: report.failures };
}

export function MigratePage() {
  const { t } = useI18n();
  const [allTools, setAllTools] = useState<AITool[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState<ScanFilter>(ALL_TOOLS_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, "idle" | "success" | "error">>({});
  const [rowIssues, setRowIssues] = useState<Record<string, LifecycleIssue[]>>({});
  const [rowRetryable, setRowRetryable] = useState<Record<string, boolean>>({});
  const [preflightByPath, setPreflightByPath] = useState<Record<string, MigrationPreflight>>({});
  const [migrationSummary, setMigrationSummary] = useState<MigrationBatchSummary | null>(null);
  const [syncIssueDialogOpen, setSyncIssueDialogOpen] = useState(false);
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const [descTooltip, setDescTooltip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  const descTimerRef = useRef<number>(0);
  const { toast } = useToast();

  const detectedTools = useMemo(
    () => allTools.filter((tool) => tool.is_detected && tool.is_enabled),
    [allTools],
  );

  const removeCandidatePaths = useCallback((paths: string[]) => {
    if (paths.length === 0) return;

    const removed = new Set(paths);
    setScanResults((prev) =>
      prev.map((result) => ({
        ...result,
        skills: result.skills.filter((skill) => !removed.has(skill.path)),
      })),
    );
    setSelected((prev) => new Set([...prev].filter((path) => !removed.has(path))));
    setRowStatus((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([path]) => !removed.has(path))),
    );
    setRowIssues((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([path]) => !removed.has(path))),
    );
    setRowRetryable((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([path]) => !removed.has(path))),
    );
    setPreflightByPath((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([path]) => !removed.has(path))),
    );
  }, []);

  // Smart scan: scan all detected & enabled tools
  const smartScan = useCallback(async (tools: AITool[]) => {
    const targets = tools.filter((tool) => tool.is_detected && tool.is_enabled);
    if (targets.length === 0) return;

    setScanning(true);
    setSelected(new Set());
    setMigrationSummary(null);
    await yieldToBrowser();

    const results: ScanResult[] = [];

    try {
      // Try batch API first
      const toolIds = targets.map((tool) => tool.id);
      const allSkills = await scanAllLocalSkills(toolIds);

      // Group results by tool
      const grouped = new Map<string, LocalSkill[]>();
      for (const skill of allSkills) {
        const tid = skill.tool_id ?? "unknown";
        if (!grouped.has(tid)) grouped.set(tid, []);
        grouped.get(tid)!.push(skill);
      }

      for (const tool of targets) {
        results.push({
          toolId: tool.id,
          toolName: tool.name,
          skills: grouped.get(tool.id) ?? [],
        });
      }
    } catch {
      // Fallback: scan each tool individually
      /* eslint-disable eslint/no-await-in-loop -- fallback sequential scan */
      for (const tool of targets) {
        try {
          const skills = await scanLocalSkills(tool.id);
          for (const s of skills) {
            s.tool_id = tool.id;
            s.tool_name = tool.name;
          }
          results.push({ toolId: tool.id, toolName: tool.name, skills });
        } catch (e) {
          results.push({
            toolId: tool.id,
            toolName: tool.name,
            skills: [],
            error: String((e as Error).message ?? e),
          });
        }
      }
      /* eslint-enable eslint/no-await-in-loop */
    }

    setScanResults(results);
    const status: Record<string, "idle"> = {};
    results
      .flatMap((r) => r.skills)
      .forEach((s) => {
        status[s.path] = "idle";
      });
    setRowStatus(status);
    setRowIssues({});
    setRowRetryable({});
    setPreflightByPath({});
    setScanning(false);
    setHasScannedOnce(true);
  }, []);

  // Scan a single tool
  const scanSingle = useCallback(
    async (toolId: string) => {
      const tool = allTools.find((entry) => entry.id === toolId);
      if (!tool) return;

      setScanning(true);
      setMigrationSummary(null);
      await yieldToBrowser();
      try {
        const skills = await scanLocalSkills(toolId);
        for (const s of skills) {
          s.tool_id = tool.id;
          s.tool_name = tool.name;
        }

        setScanResults((prev) => {
          const existing = prev.filter((r) => r.toolId !== toolId);
          return [...existing, { toolId: tool.id, toolName: tool.name, skills }];
        });

        const status: Record<string, "idle"> = {};
        skills.forEach((s) => {
          status[s.path] = "idle";
        });
        setRowStatus((prev) => {
          // Remove old entries for this tool, add new ones
          const cleaned = Object.fromEntries(
            Object.entries(prev).filter(
              ([path]) =>
                !prev[path] ||
                !scanResults.find((r) => r.toolId === toolId)?.skills.some((s) => s.path === path),
            ),
          );
          return { ...cleaned, ...status };
        });
        const nextPaths = new Set(skills.map((skill) => skill.path));
        const isPathFromRescannedTool = (path: string) =>
          scanResults.find((r) => r.toolId === toolId)?.skills.some((s) => s.path === path) ||
          nextPaths.has(path);
        setRowIssues((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([path]) => !isPathFromRescannedTool(path)),
          ),
        );
        setRowRetryable((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([path]) => !isPathFromRescannedTool(path)),
          ),
        );
        setPreflightByPath((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([path]) => !isPathFromRescannedTool(path)),
          ),
        );
      } catch (e) {
        toast({
          variant: "error",
          title: t("migrate.toast.scanFailed", { name: tool.name }),
          description: String((e as Error).message ?? e),
        });
      } finally {
        setScanning(false);
      }
    },
    [allTools, scanResults, t, toast],
  );

  // Auto-scan on mount when tools are loaded
  useEffect(() => {
    getTools()
      .then((data) => {
        setAllTools(data);
        // Smart scan: automatically scan all detected & enabled tools
        const detected = data.filter((tool) => tool.is_detected && tool.is_enabled);
        if (detected.length > 0) {
          void (async () => {
            await yieldToBrowser();
            await smartScan(data);
          })();
        }
      })
      .catch((e) => toast({ variant: "error", title: String((e as Error).message ?? e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered skills based on current filter
  const filteredSkills = useMemo(() => {
    if (filter === ALL_TOOLS_FILTER) {
      return scanResults.flatMap((r) => r.skills);
    }
    return scanResults.find((r) => r.toolId === filter)?.skills ?? [];
  }, [scanResults, filter]);

  useEffect(() => {
    const visiblePaths = new Set(filteredSkills.map((skill) => skill.path));
    setSelected((prev) => {
      const next = new Set([...prev].filter((path) => visiblePaths.has(path)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSkills]);

  const totalSkillCount = scanResults.reduce((sum, r) => sum + r.skills.length, 0);
  const toolsWithSkills = scanResults.filter((r) => r.skills.length > 0);

  const toggleSelected = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getSkillId = (skill: LocalSkill) => skill.name.toLowerCase().replace(/\s+/g, "-");

  const isBlocked = (skill: LocalSkill) => preflightByPath[skill.path]?.report.status === "blocked";

  const getBlockingReason = (skill: LocalSkill) => {
    const failure = preflightByPath[skill.path]?.report.failures[0];
    return failure?.message;
  };

  const getErrorMsg = (skill: LocalSkill) => {
    const blockingReason = getBlockingReason(skill);
    if (blockingReason) return blockingReason;

    const warning = preflightByPath[skill.path]?.report.warnings[0];
    if (warning) return warning.message;

    const failures = rowIssues[skill.path] ?? [];
    if (failures.length === 0) return undefined;

    const first = failures[0];
    const path = first.path ?? first.target_path;
    return path ? `${first.message} (${path})` : first.message;
  };

  const formatSyncIssue = useCallback(
    (issue: LifecycleIssue) =>
      t("migrate.syncIssue.item", {
        tool: issue.tool_name ?? issue.tool_id ?? t("migrate.syncIssue.unknownTool"),
        reason: issue.message,
      }),
    [t],
  );

  const syncIssuePreview = useMemo(() => {
    if (!migrationSummary || migrationSummary.syncIssues.length === 0) return undefined;
    return formatSyncIssue(dedupeSyncIssues(migrationSummary.syncIssues)[0]);
  }, [formatSyncIssue, migrationSummary]);

  const syncIssueItems = useMemo(
    () => (migrationSummary ? listSyncIssues(migrationSummary.syncIssues) : []),
    [migrationSummary],
  );

  const renderSkillSubtitle = (skill: LocalSkill) => {
    const description = skill.metadata?.description?.trim();
    const version = skill.metadata?.version;
    const errorMsg = getErrorMsg(skill);

    const descLine = description ? (
      <span
        className="block text-12 text-text-tertiary truncate"
        onMouseEnter={(e) => {
          descTimerRef.current = window.setTimeout(() => {
            setDescTooltip({ text: description, x: e.clientX, y: e.clientY });
          }, 1000);
        }}
        onMouseMove={(e) => {
          if (descTooltip) {
            setDescTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
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

  const canRetry = (skill: LocalSkill) => {
    if (rowStatus[skill.path] !== "error") return false;
    const report = preflightByPath[skill.path]?.report;
    if (report?.status === "blocked") return false;
    return rowRetryable[skill.path] === true;
  };

  const toggleAll = () => {
    if (selected.size === filteredSkills.length) setSelected(new Set());
    else setSelected(new Set(filteredSkills.filter((s) => !isBlocked(s)).map((s) => s.path)));
  };

  useEffect(() => {
    let cancelled = false;
    const targets = filteredSkills.filter(
      (skill) => selected.has(skill.path) && !preflightByPath[skill.path],
    );
    if (targets.length === 0) return;

    void (async () => {
      const entries = await Promise.all(
        targets.map(async (skill) => {
          try {
            const preflight = await preflightMigrateLocalSkill(skill.path, getSkillId(skill));
            return [skill.path, preflight] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setPreflightByPath((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [filteredSkills, preflightByPath, selected]);

  const migrateSelected = async () => {
    const requestedPaths = Array.from(selected);
    const paths = requestedPaths.filter((path) => {
      const skill = filteredSkills.find((sk) => sk.path === path);
      return skill ? !isBlocked(skill) : true;
    });
    const total = paths.length;
    const skipped = requestedPaths.length - paths.length;
    if (total === 0) {
      setMigrationSummary({ success: 0, fail: 0, skipped, syncIssues: [] });
      setSelected(new Set());
      return;
    }

    setMigrating(true);
    setProgress({ done: 0, total });
    await yieldToBrowser();
    let success = 0,
      fail = 0,
      done = 0;
    const nextStatus = { ...rowStatus };
    const successfulPaths: string[] = [];
    const syncIssues: LifecycleIssue[] = [];
    let lastStatusFlush = 0;

    /* eslint-disable eslint/no-await-in-loop -- sequential migration with progress tracking */
    for (const path of paths) {
      const skill = filteredSkills.find((sk) => sk.path === path);
      const skillName = skill?.name ?? path;
      try {
        if (!skill) {
          throw new Error(`Missing migration source for ${path}`);
        }
        setProgress({ done, total, currentSkillName: skillName });
        await yieldToBrowser();
        const skillId = getSkillId(skill);
        const result = await migrateLocalSkill(path, skillId);
        setRowIssues((prev) => ({ ...prev, [path]: result.report.failures }));
        setRowRetryable((prev) => ({ ...prev, [path]: result.report.retryable }));
        const outcome = classifyMigrationReport(result.report);
        if (outcome.type === "source-completed") {
          nextStatus[path] = "success";
          successfulPaths.push(path);
          syncIssues.push(...outcome.syncIssues);
          success++;
        } else {
          nextStatus[path] = "error";
          fail++;
        }
      } catch {
        nextStatus[path] = "error";
        setRowRetryable((prev) => ({ ...prev, [path]: true }));
        fail++;
      } finally {
        done++;
        setProgress({ done, total, currentSkillName: skillName });

        if (done - lastStatusFlush >= STATUS_FLUSH_INTERVAL || done === total) {
          const snapshot = { ...nextStatus };
          startTransition(() => setRowStatus(snapshot));
          lastStatusFlush = done;
        }

        await yieldToBrowser();
      }
    }
    /* eslint-enable eslint/no-await-in-loop */

    setSelected(new Set());
    removeCandidatePaths(successfulPaths);
    setMigrationSummary({ success, fail, skipped, syncIssues });
    toast({
      variant: syncIssues.length > 0 ? "warning" : fail === 0 ? "success" : "info",
      title: t("migrate.toast.summary", { success, fail }),
      description:
        syncIssues.length > 0
          ? t("migrate.toast.syncIssues", {
              issue: formatSyncIssue(dedupeSyncIssues(syncIssues)[0]),
            })
          : undefined,
      durationMs: 6000,
    });
    setProgress(null);
    setMigrating(false);
  };

  const retry = async (path: string) => {
    const s = filteredSkills.find((sk) => sk.path === path);
    const skillId = getSkillId(s!);
    try {
      const result = await migrateLocalSkill(path, skillId);
      setRowIssues((prev) => ({ ...prev, [path]: result.report.failures }));
      setRowRetryable((prev) => ({ ...prev, [path]: result.report.retryable }));
      const outcome = classifyMigrationReport(result.report);
      setRowStatus((prev) => ({
        ...prev,
        [path]: outcome.type === "source-completed" ? "success" : "error",
      }));
      if (outcome.type !== "source-completed") {
        toast({
          variant: "error",
          title: t("migrate.toast.failed", { name: s!.name }),
          description: getFailureDescription(outcome.failures),
          durationMs: 6000,
        });
        return;
      }
      removeCandidatePaths([path]);
      setMigrationSummary({ success: 1, fail: 0, skipped: 0, syncIssues: outcome.syncIssues });
      toast({
        variant: outcome.syncIssues.length > 0 ? "warning" : "success",
        title: t("migrate.toast.success", { name: s!.name }),
        description:
          outcome.syncIssues.length > 0
            ? t("migrate.toast.syncIssues", {
                issue: formatSyncIssue(dedupeSyncIssues(outcome.syncIssues)[0]),
              })
            : undefined,
        durationMs: 6000,
      });
    } catch {
      setRowStatus((prev) => ({ ...prev, [path]: "error" }));
      setRowRetryable((prev) => ({ ...prev, [path]: true }));
      toast({ variant: "error", title: t("migrate.toast.failed", { name: s!.name }) });
    }
  };

  const handleScanAction = () => {
    if (filter === ALL_TOOLS_FILTER) {
      smartScan(allTools);
    } else {
      scanSingle(filter);
    }
  };

  const filterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      {
        value: ALL_TOOLS_FILTER,
        label: t("migrate.filter.allTools", { count: detectedTools.length }),
      },
    ];
    for (const tool of detectedTools) {
      opts.push({ value: tool.id, label: tool.name });
    }
    return opts;
  }, [detectedTools, t]);

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
    ].filter(Boolean) as React.ReactNode[];

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

        {/* Filter bar */}
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

        {/* Scan errors */}
        {scanResults
          .filter((r) => r.error)
          .map((r) => (
            <div
              key={r.toolId}
              className="mb-2 px-3 py-2 rounded-md bg-danger/10 border border-danger/20 text-13 text-danger flex items-center gap-2"
            >
              <span className="font-medium">{r.toolName}:</span>
              <span>{r.error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scanSingle(r.toolId)}
                className="ml-auto"
                disabled={migrating}
              >
                {t("common.retry")}
              </Button>
            </div>
          ))}

        {/* Batch action bar */}
        {filteredSkills.length > 0 && (
          <div className="bottom-action-bar mb-4 mt-0 rounded-lg border border-border-subtle bg-surface">
            <Checkbox
              checked={
                selected.size === filteredSkills.length
                  ? true
                  : selected.size === 0
                    ? false
                    : "indeterminate"
              }
              onChange={toggleAll}
              label={t("migrate.selectAll")}
              disabled={migrating}
            />
            <span className="text-13 text-text-secondary">
              {selected.size > 0
                ? t("migrate.selectedOfTotal", {
                    selected: selected.size,
                    total: filteredSkills.length,
                  })
                : t("migrate.skillCount", { count: filteredSkills.length })}
            </span>
            {selected.size > 0 && (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<ArrowRight size={14} />}
                  loading={migrating}
                  onClick={migrateSelected}
                >
                  {t("migrate.migrateSelected", { count: selected.size })}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  disabled={migrating}
                >
                  {t("common.clear")}
                </Button>
              </div>
            )}
          </div>
        )}

        {selected.size > 0 && (
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
        )}

        {migrationSummary && (
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
                    onClick={() => setSyncIssueDialogOpen(true)}
                  >
                    {t("migrate.syncIssue.viewAll", { count: migrationSummary.syncIssues.length })}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {progress && (
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
        )}

        {/* Loading state */}
        {scanning && !hasScannedOnce && (
          <div className="compact-card flex flex-col items-center justify-center gap-3 py-12">
            <RefreshCw size={24} className="text-text-tertiary animate-spin" />
            <p className="text-14 text-text-secondary">{t("migrate.scanningAll")}</p>
          </div>
        )}

        {/* Empty state */}
        {!scanning && hasScannedOnce && filteredSkills.length === 0 && (
          <div className="compact-card">
            <EmptyState
              title={
                filter === ALL_TOOLS_FILTER
                  ? t("migrate.empty.title")
                  : t("migrate.empty.title.tool")
              }
              description={
                filter === ALL_TOOLS_FILTER ? t("migrate.empty.all") : t("migrate.empty.tool")
              }
              primaryAction={{ label: t("migrate.rescan"), onClick: handleScanAction }}
            />
          </div>
        )}

        {/* Results grouped by tool */}
        {filteredSkills.length > 0 && filter === ALL_TOOLS_FILTER && toolsWithSkills.length > 1 && (
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
                    onClick={() => scanSingle(result.toolId)}
                    className="ml-auto"
                    disabled={migrating}
                  >
                    {t("migrate.rescan")}
                  </Button>
                </div>
                <ul role="rowgroup">
                  {result.skills.map((s) => (
                    <ListRow
                      key={s.path}
                      id={s.path}
                      leading={
                        <Checkbox
                          checked={selected.has(s.path)}
                          onChange={() => toggleSelected(s.path)}
                          aria-label={t("migrate.aria.select", { name: s.name })}
                          disabled={migrating || isBlocked(s)}
                        />
                      }
                      primary={<span className="text-14 text-text-primary">{s.name}</span>}
                      secondary={renderSkillSubtitle(s)}
                      meta={renderSkillMeta(s, false)}
                      trailing={
                        canRetry(s) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retry(s.path)}
                            disabled={migrating}
                          >
                            {t("common.retry")}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Flat list when filtering single tool or only one tool has results */}
        {filteredSkills.length > 0 &&
          (filter !== ALL_TOOLS_FILTER || toolsWithSkills.length <= 1) && (
            <ul role="rowgroup">
              {filteredSkills.map((s) => (
                <ListRow
                  key={s.path}
                  id={s.path}
                  leading={
                    <Checkbox
                      checked={selected.has(s.path)}
                      onChange={() => toggleSelected(s.path)}
                      aria-label={t("migrate.aria.select", { name: s.name })}
                      disabled={migrating || isBlocked(s)}
                    />
                  }
                  primary={<span className="text-14 text-text-primary">{s.name}</span>}
                  secondary={renderSkillSubtitle(s)}
                  meta={renderSkillMeta(s, filter === ALL_TOOLS_FILTER)}
                  trailing={
                    canRetry(s) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retry(s.path)}
                        disabled={migrating}
                      >
                        {t("common.retry")}
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </ul>
          )}
      </main>
      {syncIssueDialogOpen && migrationSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("migrate.syncIssue.dialog.title")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSyncIssueDialogOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSyncIssueDialogOpen(false);
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
              <IconButton
                icon={<X size={16} />}
                aria-label={t("common.close")}
                onClick={() => setSyncIssueDialogOpen(false)}
              />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <ul className="space-y-2">
                {syncIssueItems.map(({ key, issue }) => (
                  <li
                    key={key}
                    className="rounded-md border border-warning/30 bg-warning-bg px-3 py-2"
                  >
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
      )}
      {descTooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-64 rounded-md bg-text-primary px-2 py-1 text-12 text-canvas shadow-md leading-relaxed"
          style={{ left: descTooltip.x + 12, top: descTooltip.y + 12 }}
        >
          {descTooltip.text}
        </div>
      )}
    </>
  );
}
