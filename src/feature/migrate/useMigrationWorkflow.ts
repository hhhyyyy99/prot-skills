import { startTransition, useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getTools,
  scanLocalSkills,
  scanAllLocalSkills,
  migrateLocalSkill,
  preflightMigrateLocalSkill,
} from "@/api";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/shell/LanguageProvider";
import type { AITool, LifecycleIssue, LocalSkill, MigrationPreflight } from "@/types";
import {
  classifyMigrationReport,
  dedupeSyncIssues,
  getFailureDescription,
  listSyncIssues,
} from "./migrationUtils";
import {
  ALL_TOOLS_FILTER,
  type MigrationBatchSummary,
  type MigrationProgress,
  type MigrationRowStatus,
  type ScanFilter,
  type ScanResult,
} from "./migrationTypes";

const STATUS_FLUSH_INTERVAL = 8;

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function getSkillId(skill: LocalSkill) {
  return skill.name.toLowerCase().replace(/\s+/g, "-");
}

export function useMigrationWorkflow() {
  const { t } = useI18n();
  const [allTools, setAllTools] = useState<AITool[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState<ScanFilter>(ALL_TOOLS_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, MigrationRowStatus>>({});
  const [rowIssues, setRowIssues] = useState<Record<string, LifecycleIssue[]>>({});
  const [rowRetryable, setRowRetryable] = useState<Record<string, boolean>>({});
  const [preflightByPath, setPreflightByPath] = useState<Record<string, MigrationPreflight>>({});
  const [migrationSummary, setMigrationSummary] = useState<MigrationBatchSummary | null>(null);
  const [syncIssueDialogOpen, setSyncIssueDialogOpen] = useState(false);
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const preflightPendingPaths = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    const pendingPaths = preflightPendingPaths.current;
    return () => {
      mountedRef.current = false;
      pendingPaths.clear();
    };
  }, []);

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
    for (const path of removed) {
      preflightPendingPaths.current.delete(path);
    }
  }, []);

  const smartScan = useCallback(async (tools: AITool[]) => {
    const targets = tools.filter((tool) => tool.is_detected && tool.is_enabled);
    if (targets.length === 0) return;

    setScanning(true);
    setSelected(new Set());
    setMigrationSummary(null);
    preflightPendingPaths.current.clear();
    await yieldToBrowser();

    const results: ScanResult[] = [];

    try {
      const toolIds = targets.map((tool) => tool.id);
      const allSkills = await scanAllLocalSkills(toolIds);

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
      /* eslint-disable eslint/no-await-in-loop -- fallback sequential scan */
      for (const tool of targets) {
        try {
          const skills = await scanLocalSkills(tool.id);
          for (const skill of skills) {
            skill.tool_id = tool.id;
            skill.tool_name = tool.name;
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
    const status: Record<string, MigrationRowStatus> = {};
    results
      .flatMap((result) => result.skills)
      .forEach((skill) => {
        status[skill.path] = "idle";
      });
    setRowStatus(status);
    setRowIssues({});
    setRowRetryable({});
    setPreflightByPath({});
    setScanning(false);
    setHasScannedOnce(true);
  }, []);

  const scanSingle = useCallback(
    async (toolId: string) => {
      const tool = allTools.find((entry) => entry.id === toolId);
      if (!tool) return;

      setScanning(true);
      setMigrationSummary(null);
      await yieldToBrowser();
      try {
        const skills = await scanLocalSkills(toolId);
        for (const skill of skills) {
          skill.tool_id = tool.id;
          skill.tool_name = tool.name;
        }

        setScanResults((prev) => {
          const existing = prev.filter((result) => result.toolId !== toolId);
          return [...existing, { toolId: tool.id, toolName: tool.name, skills }];
        });

        const status: Record<string, MigrationRowStatus> = {};
        skills.forEach((skill) => {
          status[skill.path] = "idle";
        });
        setRowStatus((prev) => {
          const cleaned = Object.fromEntries(
            Object.entries(prev).filter(
              ([path]) =>
                !prev[path] ||
                !scanResults
                  .find((result) => result.toolId === toolId)
                  ?.skills.some((skill) => skill.path === path),
            ),
          );
          return { ...cleaned, ...status };
        });
        const nextPaths = new Set(skills.map((skill) => skill.path));
        const isPathFromRescannedTool = (path: string) =>
          scanResults
            .find((result) => result.toolId === toolId)
            ?.skills.some((skill) => skill.path === path) || nextPaths.has(path);
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
        for (const path of preflightPendingPaths.current) {
          if (isPathFromRescannedTool(path)) preflightPendingPaths.current.delete(path);
        }
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

  useEffect(() => {
    getTools()
      .then((data) => {
        setAllTools(data);
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

  const filteredSkills = useMemo(() => {
    if (filter === ALL_TOOLS_FILTER) {
      return scanResults.flatMap((result) => result.skills);
    }
    return scanResults.find((result) => result.toolId === filter)?.skills ?? [];
  }, [scanResults, filter]);

  useEffect(() => {
    const visiblePaths = new Set(filteredSkills.map((skill) => skill.path));
    setSelected((prev) => {
      const next = new Set([...prev].filter((path) => visiblePaths.has(path)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSkills]);

  const totalSkillCount = scanResults.reduce((sum, result) => sum + result.skills.length, 0);
  const toolsWithSkills = scanResults.filter((result) => result.skills.length > 0);

  const toggleSelected = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

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

  const canRetry = (skill: LocalSkill) => {
    if (rowStatus[skill.path] !== "error") return false;
    const report = preflightByPath[skill.path]?.report;
    if (report?.status === "blocked") return false;
    return rowRetryable[skill.path] === true;
  };

  const toggleAll = () => {
    if (selected.size === filteredSkills.length) setSelected(new Set());
    else
      setSelected(
        new Set(filteredSkills.filter((skill) => !isBlocked(skill)).map((skill) => skill.path)),
      );
  };

  useEffect(() => {
    let cancelled = false;
    const targets = filteredSkills.filter(
      (skill) =>
        selected.has(skill.path) &&
        !preflightByPath[skill.path] &&
        !preflightPendingPaths.current.has(skill.path),
    );
    if (targets.length === 0) return;

    const targetPaths = targets.map((skill) => skill.path);
    const clearPendingPaths = () => {
      for (const path of targetPaths) {
        preflightPendingPaths.current.delete(path);
      }
    };

    for (const path of targetPaths) {
      preflightPendingPaths.current.add(path);
    }

    void (async () => {
      await yieldToBrowser();
      if (cancelled || !mountedRef.current) {
        clearPendingPaths();
        return;
      }

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

      clearPendingPaths();
      if (cancelled || !mountedRef.current) return;

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
      const skill = filteredSkills.find((entry) => entry.path === path);
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
      const skill = filteredSkills.find((entry) => entry.path === path);
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
    const skill = filteredSkills.find((entry) => entry.path === path);
    const skillId = getSkillId(skill!);
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
          title: t("migrate.toast.failed", { name: skill!.name }),
          description: getFailureDescription(outcome.failures),
          durationMs: 6000,
        });
        return;
      }
      removeCandidatePaths([path]);
      setMigrationSummary({ success: 1, fail: 0, skipped: 0, syncIssues: outcome.syncIssues });
      toast({
        variant: outcome.syncIssues.length > 0 ? "warning" : "success",
        title: t("migrate.toast.success", { name: skill!.name }),
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
      toast({ variant: "error", title: t("migrate.toast.failed", { name: skill!.name }) });
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

  return {
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
  };
}
