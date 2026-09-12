/**
 * usePageBuilder — hook for page builder state: load, save, config, JSON mode.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { readScenarioAll, updateScenarioFields } from "../../shared/api/scenarios.api";
import type {
  PageConfig,
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import {
  createEmptyPageConfig,
  parsePageConfig,
  ALL_ZONES,
} from "@wwwuabot/shared/types/page-config";
import type { SavingActionType } from "@wwwuabot/shared";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function usePageBuilder() {
  const { codeword } = useParams<{ codeword: string }>();
  const navigate = useNavigate();

  const [config, setConfig] = useState<PageConfig>(createEmptyPageConfig());
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);
  const [scenarioPhoto, setScenarioPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savingAction, setSavingAction] = useState<SavingActionType>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [expandedZones, setExpandedZones] = useState<Set<BlockZone>>(() => new Set());

  const handleToggleZone = useCallback((zone: BlockZone) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  const allExpanded = useMemo(
    () => ALL_ZONES.length > 0 && ALL_ZONES.every((z) => expandedZones.has(z)),
    [expandedZones],
  );
  const allCollapsed = useMemo(
    () => ALL_ZONES.every((z) => !expandedZones.has(z)),
    [expandedZones],
  );
  const handleExpandAll = useCallback(() => {
    setExpandedZones(new Set(ALL_ZONES));
  }, []);
  const handleCollapseAll = useCallback(() => {
    setExpandedZones(new Set());
  }, []);

  const context: BlockContext = useMemo(
    () => ({ codeword: codeword ?? "", title: scenarioTitle, photoUrl: scenarioPhoto }),
    [codeword, scenarioTitle, scenarioPhoto],
  );

  // Load scenario
  useEffect(() => {
    if (!codeword) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword, "portal");
        if (cancelled) return;
        if (!row) {
          setError("Сценарій не знайдено");
          setLoading(false);
          return;
        }
        setScenarioTitle(((row as Record<string, unknown>).title as string) ?? null);
        setScenarioPhoto(((row as Record<string, unknown>).photo_url as string) ?? null);
        const raw = (row as Record<string, unknown>).page_data;
        const parsed =
          typeof raw === "string"
            ? parsePageConfig(raw)
            : typeof raw === "object" && raw !== null
              ? (raw as PageConfig)
              : null;
        if (parsed) setConfig(parsed);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeword]);

  // Save
  const handleSave = useCallback(
    async (shouldClose: boolean = false) => {
      if (!codeword) return;
      setSaveStatus("saving");
      setSavingAction(shouldClose ? "saveAndClose" : "save");
      try {
        await updateScenarioFields(codeword, { page_data: JSON.stringify(config) }, "portal");
        setSaveStatus("saved");
        if (shouldClose) setTimeout(() => navigate("/scenarios-v2"), 500);
        else setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setSaveStatus("error");
        setError((e as Error).message);
      } finally {
        setSavingAction(null);
      }
    },
    [codeword, config, navigate],
  );

  // Update zone blocks
  const handleUpdateZoneBlocks = useCallback((zone: BlockZone, blocks: PageBlock[]) => {
    setConfig((prev) => ({ ...prev, zones: { ...prev.zones, [zone]: blocks } }));
  }, []);

  // JSON export/import
  const handleExport = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    setJsonText(json);
    setJsonMode(true);
  }, [config]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object" && "zones" in parsed) {
        setConfig(parsed as PageConfig);
        setJsonMode(false);
        setJsonError(null);
      } else {
        setJsonError("JSON повинен містити поле 'zones'");
      }
    } catch {
      setJsonError("Невалідний JSON");
    }
  }, [jsonText]);

  const handleBack = useCallback(() => {
    navigate("/scenarios-v2");
  }, [navigate]);

  return {
    codeword,
    config,
    scenarioTitle,
    loading,
    saveStatus,
    savingAction,
    error,
    jsonMode,
    jsonText,
    jsonError,
    expandedZones,
    allExpanded,
    allCollapsed,
    context,
    setJsonMode,
    setJsonText,
    setJsonError,
    setError,
    handleToggleZone,
    handleExpandAll,
    handleCollapseAll,
    handleSave,
    handleUpdateZoneBlocks,
    handleExport,
    handleImport,
    handleBack,
  };
}
