/**
 * useScenarioJsonEditor — підвкладка «JSON»: текст, валідація, копіювання,
 * форматування й застосування до полів сценарію.
 *
 * Текст перечитуємо **лише** коли вкладку відкрили або в JSON перемкнули
 * головну: інакше кожен символ у textarea перезаписувався б із полів.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { applyJsonToFields, jsonTextForTab, parseJsonObject } from "./scenario-json-validation";
import type { MainTab, SubTab } from "./scenario-modal-types";

export interface ScenarioJsonEditor {
  text: string;
  error: string | null;
  copied: boolean;
  applied: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;

  /** Відкрити вкладку: текст будується з полів поточної головної вкладки. */
  open: () => void;
  change: (value: string) => void;
  copy: () => Promise<void>;
  format: () => void;
  apply: () => void;
  /** Виклик зі збереження: застосовує текст і віддає поля або причину відмови. */
  applyToFields: () =>
    | { ok: true; fields: Record<string, unknown> }
    | { ok: false; error: string; saveMessage: string };
}

export function useScenarioJsonEditor({
  mainTab,
  subTab,
  allFields,
  setAllFields,
}: {
  mainTab: MainTab;
  subTab: SubTab;
  allFields: Record<string, unknown>;
  setAllFields: Dispatch<SetStateAction<Record<string, unknown>>>;
}): ScenarioJsonEditor {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const prevSubTabRef = useRef<SubTab>(subTab);
  const prevMainTabRef = useRef<MainTab>(mainTab);

  const reset = useCallback((next: string) => {
    setText(next);
    setError(null);
    setCopied(false);
    setApplied(false);
  }, []);

  const open = useCallback(() => {
    reset(jsonTextForTab(mainTab, allFields));
  }, [mainTab, allFields, reset]);

  useEffect(() => {
    const justOpenedJson = subTab === "json" && prevSubTabRef.current !== "json";
    const mainTabChangedInJson = subTab === "json" && prevMainTabRef.current !== mainTab;

    if (justOpenedJson || mainTabChangedInJson) {
      reset(jsonTextForTab(mainTab, allFields));
    }
    prevSubTabRef.current = subTab;
    prevMainTabRef.current = mainTab;
  }, [subTab, mainTab, allFields, reset]);

  const change = useCallback((value: string) => {
    setText(value);
    setApplied(false);
    const parsed = parseJsonObject(value);
    setError(parsed.ok ? null : parsed.error);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textareaRef.current) textareaRef.current.select();
    }
  }, [text]);

  const format = useCallback(() => {
    const parsed = parseJsonObject(text);
    if (parsed.ok) {
      setText(JSON.stringify(parsed.value, null, 2));
      setError(null);
    }
  }, [text]);

  const apply = useCallback(() => {
    const parsed = parseJsonObject(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setAllFields(applyJsonToFields(parsed.value, mainTab, allFields));
    setError(null);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }, [text, mainTab, allFields, setAllFields]);

  const applyToFields = useCallback((): ReturnType<ScenarioJsonEditor["applyToFields"]> => {
    const parsed = parseJsonObject(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return { ok: false, error: parsed.error, saveMessage: parsed.saveMessage };
    }
    const fields = applyJsonToFields(parsed.value, mainTab, allFields);
    setAllFields(fields);
    return { ok: true, fields };
  }, [text, mainTab, allFields, setAllFields]);

  return {
    text,
    error,
    copied,
    applied,
    textareaRef,
    open,
    change,
    copy,
    format,
    apply,
    applyToFields,
  };
}
