/**
 * useScenarioCard — логіка модалки сценарію: завантаження рядка, вкладки,
 * збереження. JSON-редактор — окремий хук (`useScenarioJsonEditor`), бо це
 * інша відповідальність і власна пара «текст ↔ поля».
 */

import { useCallback, useEffect, useState } from "react";
import type { SavingActionType } from "@wwwuabot/shared";
import { readScenarioAll, updateScenarioFields } from "../../shared/api/scenarios.api";
import { serializeJsonFields } from "./scenario-json-helpers";
import { stripServerFields } from "./scenario-json-validation";
import type { MainTab, SubTab } from "./scenario-modal-types";
import { useScenarioJsonEditor, type ScenarioJsonEditor } from "./useScenarioJsonEditor";
import { useScenarioShortcuts } from "./useScenarioShortcuts";

export interface ScenarioCardController {
  allFields: Record<string, unknown>;
  mainTab: MainTab;
  subTab: SubTab;
  loading: boolean;
  saving: boolean;
  savingAction: SavingActionType;
  justSaved: boolean;
  success: boolean;
  error: string | null;
  fullscreenBuilder: boolean;
  json: ScenarioJsonEditor;

  selectMainTab: (tab: MainTab) => void;
  selectSubTab: (tab: SubTab) => void;
  updateField: (key: string, value: unknown) => void;
  handleSave: (shouldClose?: boolean) => Promise<void>;
  openJsonTab: () => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
}

export function useScenarioCard({
  slug,
  onSaved,
  onClose,
  initialSubTab,
}: {
  slug: string;
  onSaved: () => void;
  onClose: () => void;
  initialSubTab?: SubTab;
}): ScenarioCardController {
  const [mainTab, setMainTab] = useState<MainTab>("web");
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? "preview");
  const [allFields, setAllFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<SavingActionType>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullscreenBuilder, setFullscreenBuilder] = useState(false);

  const json = useScenarioJsonEditor({ mainTab, subTab, allFields, setAllFields });

  // ── Завантаження рядка ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(slug);
        if (cancelled) return;
        if (row) {
          setAllFields(row);
          setLoading(false);
        } else {
          setError("Сценарій не знайдено");
          setLoading(false);
        }
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
  }, [slug]);

  const updateField = useCallback((key: string, value: unknown) => {
    setAllFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Збереження (якщо відкрито JSON — спершу застосовуємо текст редактора) ──
  const handleSave = useCallback(
    async (shouldClose: boolean = false) => {
      setSaving(true);
      setSavingAction(shouldClose ? "saveAndClose" : "save");
      setError(null);
      setJustSaved(false);
      try {
        let fieldsToSave = { ...allFields };

        if (subTab === "json") {
          const applied = json.applyToFields();
          if (!applied.ok) throw new Error(applied.saveMessage);
          fieldsToSave = applied.fields;
        }

        const serializedPayload = serializeJsonFields(stripServerFields(fieldsToSave));
        // Рядок адресуємо номером: адреса в тілі — нове значення, а не ключ.
        await updateScenarioFields(
          { id: typeof allFields.id === "number" ? allFields.id : null, slug },
          serializedPayload,
        );

        setSuccess(true);
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [slug, allFields, onSaved, onClose, subTab, json],
  );

  useScenarioShortcuts({
    onEscape: onClose,
    onSave: () => void handleSave(false),
    enabled: !saving && !loading,
  });

  const openJsonTab = useCallback(() => {
    json.open();
    setSubTab("json");
  }, [json]);

  const selectMainTab = useCallback((tab: MainTab) => {
    setMainTab(tab);
    setSubTab("preview");
  }, []);

  return {
    allFields,
    mainTab,
    subTab,
    loading,
    saving,
    savingAction,
    justSaved,
    success,
    error,
    fullscreenBuilder,
    json,

    selectMainTab,
    selectSubTab: setSubTab,
    updateField,
    handleSave,
    openJsonTab,
    openFullscreen: () => setFullscreenBuilder(true),
    closeFullscreen: () => setFullscreenBuilder(false),
  };
}
