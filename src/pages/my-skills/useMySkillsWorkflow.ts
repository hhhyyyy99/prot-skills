import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSkillLinks,
  getSkills,
  getTools,
  openFolder,
  setAllSkillToolLinks,
  setSkillToolLink,
  uninstallSkill,
} from "@/api";
import { useToast } from "@/hooks/useToast";
import { filterSkills } from "@/lib/filter";
import { useI18n } from "@/shell/LanguageProvider";
import type { AITool, Skill, SkillLink, SyncSkillTargetsResult } from "@/types";
import {
  buildBulkSyncFailureDescription,
  buildSyncFailureDescription,
  isLocalSource,
  type BulkSyncFailureItem,
} from "./mySkillsUtils";
import type { BulkSyncProgress, BulkSyncSummary, LinkFilter } from "./mySkillsTypes";

const LINK_BATCH_SIZE = 8;
const BULK_SYNC_FEEDBACK_DURATION_MS = 4000;
const STATUS_FLUSH_INTERVAL = 1;

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

export function useMySkillsWorkflow() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [linksBySkill, setLinksBySkill] = useState<Record<string, SkillLink[]>>({});
  const [q, setQ] = useState("");
  const [sourceType, setSourceType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [uninstallSkillId, setUninstallSkillId] = useState<string | null>(null);
  const [uninstallIssuesBySkill, setUninstallIssuesBySkill] = useState<Record<string, string>>({});
  const [syncSkillId, setSyncSkillId] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkSyncConfirmOpen, setBulkSyncConfirmOpen] = useState(false);
  const [bulkSyncProgress, setBulkSyncProgress] = useState<BulkSyncProgress | null>(null);
  const [bulkSyncSummary, setBulkSyncSummary] = useState<BulkSyncSummary | null>(null);
  const bulkSyncFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshToken = useRef(0);
  const { toast } = useToast();

  const refresh = useCallback(() => {
    const token = refreshToken.current + 1;
    refreshToken.current = token;
    setLoading(true);
    setError(null);
    Promise.all([getSkills(), getTools()])
      .then(async ([nextSkills, nextTools]) => {
        startTransition(() => {
          setSkills(nextSkills);
          setTools(nextTools);
          setLinksBySkill({});
          setLoading(false);
        });

        if (nextSkills.length === 0) {
          return;
        }

        await yieldToBrowser();

        /* eslint-disable eslint/no-await-in-loop -- batched link loading keeps large lists responsive */
        for (let index = 0; index < nextSkills.length; index += LINK_BATCH_SIZE) {
          const batch = nextSkills.slice(index, index + LINK_BATCH_SIZE);
          const linkEntries = await Promise.all(
            batch.map(async (skill) => {
              try {
                const links = await getSkillLinks(skill.id);
                return [skill.id, links] as const;
              } catch (e) {
                toast({
                  variant: "error",
                  title: t("mySkills.error.links"),
                  description: String((e as Error).message ?? e),
                });
                return [skill.id, []] as const;
              }
            }),
          );

          if (refreshToken.current !== token) {
            return;
          }

          startTransition(() => {
            setLinksBySkill((current) => ({
              ...current,
              ...Object.fromEntries(linkEntries),
            }));
          });

          if (index + LINK_BATCH_SIZE < nextSkills.length) {
            await yieldToBrowser();
          }
        }
        /* eslint-enable eslint/no-await-in-loop */
      })
      .catch((e: unknown) => {
        if (refreshToken.current === token) {
          setError(String((e as Error).message ?? e));
        }
      })
      .finally(() => {
        if (refreshToken.current === token) {
          setLoading(false);
        }
      });
  }, [toast, t]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTick]);

  useEffect(() => {
    return () => {
      if (bulkSyncFeedbackTimer.current) clearTimeout(bulkSyncFeedbackTimer.current);
    };
  }, []);

  const requestRefresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  const clearBulkSyncFeedback = useCallback(() => {
    if (bulkSyncFeedbackTimer.current) {
      clearTimeout(bulkSyncFeedbackTimer.current);
      bulkSyncFeedbackTimer.current = null;
    }

    setBulkSyncProgress(null);
    setBulkSyncSummary(null);
  }, []);

  const scheduleBulkSyncFeedbackClear = useCallback(() => {
    if (bulkSyncFeedbackTimer.current) {
      clearTimeout(bulkSyncFeedbackTimer.current);
    }

    bulkSyncFeedbackTimer.current = setTimeout(() => {
      setBulkSyncProgress(null);
      setBulkSyncSummary(null);
      bulkSyncFeedbackTimer.current = null;
    }, BULK_SYNC_FEEDBACK_DURATION_MS);
  }, []);

  const visible = useMemo(() => filterSkills(skills, q, sourceType), [skills, q, sourceType]);
  const enabledCount = useMemo(() => skills.filter((skill) => skill.is_enabled).length, [skills]);
  const linkCount = useMemo(
    () =>
      Object.values(linksBySkill).reduce(
        (sum, links) => sum + links.filter((link) => link.is_active).length,
        0,
      ),
    [linksBySkill],
  );
  const enabledTools = useMemo(() => tools.filter((tool) => tool.is_enabled), [tools]);
  const syncSkill = useMemo(
    () => skills.find((skill) => skill.id === syncSkillId) ?? null,
    [skills, syncSkillId],
  );
  const uninstallTarget = useMemo(
    () => skills.find((skill) => skill.id === uninstallSkillId) ?? null,
    [skills, uninstallSkillId],
  );

  const sourceOptions = useMemo(() => {
    const types = [
      ...new Set(skills.map((skill) => skill.source_type).filter((type) => !isLocalSource(type))),
    ];
    return [
      { value: "all", label: t("mySkills.filters.all") },
      ...types.map((type) => ({ value: type, label: type })),
    ];
  }, [skills, t]);
  const showSourceFilters = sourceOptions.length > 1;

  const getActiveLinks = useCallback(
    (skillId: string) => {
      return (linksBySkill[skillId] ?? []).filter((link) => link.is_active);
    },
    [linksBySkill],
  );

  const getLinkedTools = useCallback(
    (skillId: string) => {
      const linkedToolIds = new Set(getActiveLinks(skillId).map((link) => link.tool_id));
      return tools.filter((tool) => linkedToolIds.has(tool.id));
    },
    [getActiveLinks, tools],
  );

  const isToolLinked = useCallback(
    (skillId: string, toolId: string) => {
      return getActiveLinks(skillId).some((link) => link.tool_id === toolId);
    },
    [getActiveLinks],
  );

  const isLinkedToAllEnabledTools = useCallback(
    (skillId: string) => {
      return (
        enabledTools.length > 0 && enabledTools.every((tool) => isToolLinked(skillId, tool.id))
      );
    },
    [enabledTools, isToolLinked],
  );

  const hasAnyLinkedEnabledTools = useCallback(
    (skillId: string) => {
      return enabledTools.some((tool) => isToolLinked(skillId, tool.id));
    },
    [enabledTools, isToolLinked],
  );

  const bulkSyncableSkills = useMemo(() => visible.filter((skill) => skill.is_enabled), [visible]);

  const handleOpenFolder = useCallback(
    (skill: Skill) => {
      openFolder(skill.local_path).catch((e: unknown) => {
        toast({
          variant: "error",
          title: t("mySkills.error.openFolder"),
          description: String((e as Error).message ?? e),
        });
      });
    },
    [toast, t],
  );

  const openUninstallDialog = useCallback((skillId: string) => {
    setUninstallSkillId(skillId);
  }, []);

  const closeUninstallDialog = useCallback(() => setUninstallSkillId(null), []);

  const executeUninstall = useCallback(() => {
    if (!uninstallSkillId) return;
    const id = uninstallSkillId;
    setUninstallSkillId(null);
    uninstallSkill(id)
      .then((report) => {
        if (report.status !== "success") {
          const description = report.failures
            .slice(0, 3)
            .map((failure) => failure.message)
            .join("; ");
          setUninstallIssuesBySkill((current) => ({
            ...current,
            [id]: description || t("mySkills.uninstallPartial"),
          }));
          toast({
            variant: report.status === "partial" ? "warning" : "error",
            title:
              report.status === "partial"
                ? t("mySkills.uninstallPartial")
                : t("mySkills.error.uninstall"),
            description,
            durationMs: 6000,
          });
          return;
        }
        setSkills((current) => current.filter((skill) => skill.id !== id));
        setLinksBySkill((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setUninstallIssuesBySkill((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        if (syncSkillId === id) setSyncSkillId(null);
      })
      .catch((e: unknown) => {
        toast({
          variant: "error",
          title: t("mySkills.error.uninstall"),
          description: String((e as Error).message ?? e),
        });
      });
  }, [uninstallSkillId, syncSkillId, toast, t]);

  const openSyncDialog = useCallback((skillId: string) => {
    setSyncSkillId(skillId);
    setToolQuery("");
    setLinkFilter("all");
  }, []);

  const closeSyncDialog = useCallback(() => setSyncSkillId(null), []);

  const toggleToolLink = useCallback(
    (skill: Skill, tool: AITool, active: boolean) => {
      const prev = linksBySkill;
      const previousLinks = prev[skill.id] ?? [];
      const optimisticLink: SkillLink = {
        id: Date.now(),
        skill_id: skill.id,
        tool_id: tool.id,
        link_path: `${tool.config_path}/${tool.skills_subdir}/${skill.id}`,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      setLinksBySkill((current) => {
        const existing = current[skill.id] ?? [];
        const nextLinks = active
          ? [...existing.filter((link) => link.tool_id !== tool.id), optimisticLink]
          : existing.filter((link) => link.tool_id !== tool.id);
        return { ...current, [skill.id]: nextLinks };
      });

      setSkillToolLink(skill.id, tool.id, active)
        .then((link) => {
          setLinksBySkill((current) => {
            const existing = current[skill.id] ?? [];
            const nextLinks =
              active && link
                ? [...existing.filter((item) => item.tool_id !== tool.id), link]
                : existing.filter((item) => item.tool_id !== tool.id);
            return { ...current, [skill.id]: nextLinks };
          });
          toast({
            variant: "success",
            title: active
              ? t("mySkills.toast.linked", { skill: skill.name, tool: tool.name })
              : t("mySkills.toast.unlinked", { tool: tool.name }),
          });
        })
        .catch((e: unknown) => {
          setLinksBySkill((current) => ({ ...current, [skill.id]: previousLinks }));
          toast({
            variant: "error",
            title: t("mySkills.error.linkUpdate"),
            description: String((e as Error).message ?? e),
          });
        });
    },
    [linksBySkill, toast, t],
  );

  const setAllToolLinks = useCallback(
    (skill: Skill, active: boolean) => {
      const prev = linksBySkill;
      const optimisticLinks = active
        ? enabledTools.map(
            (tool, index): SkillLink => ({
              id: Date.now() + index,
              skill_id: skill.id,
              tool_id: tool.id,
              link_path: `${tool.config_path}/${tool.skills_subdir}/${skill.id}`,
              is_active: true,
              created_at: new Date().toISOString(),
            }),
          )
        : [];

      setLinksBySkill((current) => ({ ...current, [skill.id]: optimisticLinks }));

      setAllSkillToolLinks(skill.id, active)
        .then(async (result: SyncSkillTargetsResult) => {
          const links = await getSkillLinks(skill.id);
          setLinksBySkill((current) => ({ ...current, [skill.id]: links }));

          const failureDescription = buildSyncFailureDescription(result.failed_tools, t);
          if (result.status === "success") {
            toast({
              variant: "success",
              title: active ? t("mySkills.toast.linkedAll") : t("mySkills.toast.unlinkedAll"),
            });
            return;
          }

          if (result.status === "partial") {
            toast({
              variant: "warning",
              title: active
                ? t("mySkills.toast.linkedPartial", {
                    success: result.success_count,
                    failed: result.failure_count,
                  })
                : t("mySkills.toast.unlinkedPartial", {
                    success: result.success_count,
                    failed: result.failure_count,
                  }),
              description: failureDescription,
              durationMs: 6000,
            });
            return;
          }

          toast({
            variant: "error",
            title: active ? t("mySkills.toast.linkedFailed") : t("mySkills.toast.unlinkedFailed"),
            description: failureDescription,
            durationMs: 6000,
          });
        })
        .catch((e: unknown) => {
          setLinksBySkill(prev);
          toast({
            variant: "error",
            title: t("mySkills.error.linkUpdate"),
            description: String((e as Error).message ?? e),
          });
        });
    },
    [enabledTools, linksBySkill, toast, t],
  );

  const syncAllSkills = useCallback(async () => {
    if (bulkSyncing || enabledTools.length === 0 || bulkSyncableSkills.length === 0) {
      return;
    }

    clearBulkSyncFeedback();
    setBulkSyncConfirmOpen(false);
    setBulkSyncing(true);
    setBulkSyncProgress({ done: 0, total: bulkSyncableSkills.length });
    await yieldToBrowser();

    let success = 0;
    let fail = 0;
    let flushedDone = 0;
    const failures: BulkSyncFailureItem[] = [];

    /* eslint-disable eslint/no-await-in-loop -- sequential execution required for progress tracking */
    for (const skill of bulkSyncableSkills) {
      setBulkSyncProgress((prev) => ({
        done: prev?.done ?? 0,
        total: bulkSyncableSkills.length,
        currentSkillName: skill.name,
      }));
      await yieldToBrowser();

      try {
        const result = await setAllSkillToolLinks(skill.id, true);
        const links = await getSkillLinks(skill.id);
        startTransition(() => {
          setLinksBySkill((current) => ({ ...current, [skill.id]: links }));
        });

        if (result.status === "failed") {
          fail += 1;
        } else {
          success += 1;
          if (result.status === "partial") {
            fail += 1;
          }
        }

        for (const failure of result.failed_tools) {
          failures.push({
            skillName: failure.failed_skill_name || skill.name,
            toolName: failure.tool_name,
            reason: failure.reason,
          });
        }
      } catch (e: unknown) {
        fail += 1;
        toast({
          variant: "error",
          title: t("mySkills.error.linkUpdate"),
          description: String((e as Error).message ?? e),
        });
      } finally {
        const nextDone = Math.min(flushedDone + 1, bulkSyncableSkills.length);
        if (
          nextDone - flushedDone >= STATUS_FLUSH_INTERVAL ||
          nextDone === bulkSyncableSkills.length
        ) {
          startTransition(() => {
            setBulkSyncProgress((prev) => ({
              done: Math.min((prev?.done ?? 0) + 1, bulkSyncableSkills.length),
              total: bulkSyncableSkills.length,
              currentSkillName: skill.name,
            }));
          });
          flushedDone = nextDone;
        }

        await yieldToBrowser();
      }
    }
    /* eslint-enable eslint/no-await-in-loop */

    setBulkSyncing(false);
    const failureDescription = buildBulkSyncFailureDescription(failures, t);
    setBulkSyncSummary({ success, fail, failureDescription });
    scheduleBulkSyncFeedbackClear();

    if (fail === 0) {
      toast({
        variant: "success",
        title: t("mySkills.toast.bulkSyncComplete", { success }),
      });
      return;
    }

    if (success > 0) {
      toast({
        variant: "warning",
        title: t("mySkills.toast.bulkSyncPartial", { success, failed: fail }),
        description: failureDescription,
        durationMs: 6000,
      });
      return;
    }

    toast({
      variant: "error",
      title: t("mySkills.toast.bulkSyncFailed"),
      description: failureDescription,
      durationMs: 6000,
    });
  }, [
    bulkSyncableSkills,
    bulkSyncing,
    clearBulkSyncFeedback,
    enabledTools.length,
    scheduleBulkSyncFeedbackClear,
    t,
    toast,
  ]);

  const handleBulkSyncClick = useCallback(() => {
    if (bulkSyncing || enabledTools.length === 0 || bulkSyncableSkills.length === 0) {
      return;
    }

    setBulkSyncConfirmOpen(true);
  }, [bulkSyncableSkills.length, bulkSyncing, enabledTools.length]);

  const modalTools = useMemo(() => {
    if (!syncSkill) return [];
    const query = toolQuery.trim().toLowerCase();
    return (
      enabledTools
        .filter((tool) => {
          const linked = isToolLinked(syncSkill.id, tool.id);
          if (linkFilter === "linked" && !linked) return false;
          if (linkFilter === "unlinked" && linked) return false;
          if (!query) return true;
          return `${tool.name} ${tool.id} ${tool.config_path}`.toLowerCase().includes(query);
        })
        // eslint-disable-next-line unicorn/no-array-sort -- .toSorted() not available in current TS lib target
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [enabledTools, isToolLinked, linkFilter, syncSkill, toolQuery]);

  return {
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
  };
}
