/**
 * Один трекер: історія записів, новий вимір і прибирання.
 *
 * Запис — **новий рядок**: міра стається зараз, і двоє зважувань за день — два
 * виміри. День не питаємо й не шлемо — його й момент ставить сервер.
 *
 * @module web-platform-dev/src/pages/trackers/useTracker
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import {
  compareTrackerEntries,
  todayTrackerDay,
  type Tracker,
  type TrackerEntry,
  type TrackerGroup,
} from "@wwwuabot/shared/trackers";
import { apiFetch } from "@/shared/api/client";

interface TrackerPayload {
  tracker: Tracker;
  groups: TrackerGroup[];
  entries: TrackerEntry[];
  endDay: string;
}

export interface TrackerState {
  tracker: Tracker | null;
  groups: TrackerGroup[];
  entries: TrackerEntry[];
  endDay: string;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => Promise<void>;
  save: (value: number, note: string) => Promise<boolean>;
  remove: (entryId: number) => Promise<boolean>;
  archive: () => Promise<boolean>;
  /** Пересунути трекер в іншу групу — дерева стрічки воно торкається лише після успіху. */
  move: (groupId: number | null) => Promise<boolean>;
  /** Відкрити визначення іншим; виміри не публікуються ніколи. */
  setPublic: (isPublic: boolean) => Promise<boolean>;
}

export function useTracker(id: number): TrackerState {
  const dialog = useDialog();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [groups, setGroups] = useState<TrackerGroup[]>([]);
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [endDay, setEndDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await apiFetch<TrackerPayload>(
        `/api/user/trackers?id=${id}&day=${todayTrackerDay()}`,
      );
      if (request !== generation.current) return;
      setTracker(result.tracker);
      setGroups(result.groups);
      setEntries(result.entries);
      setEndDay(result.endDay);
      setError(null);
    } catch {
      if (request === generation.current) setError("Трекера не знайдено.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    await load();
  }

  async function save(value: number, note: string): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const result = await apiFetch<{ entry: TrackerEntry }>("/api/user/trackers/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackerId: id, value, note }),
      });
      setEntries((current) => [...current, result.entry].sort(compareTrackerEntries));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося зберегти запис.", { tone: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(entryId: number): Promise<boolean> {
    try {
      await apiFetch(`/api/user/trackers/entry?id=${entryId}`, { method: "DELETE" });
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      return true;
    } catch {
      await dialog.alert("Не вдалося прибрати запис.", { tone: "danger" });
      return false;
    }
  }

  async function archive(): Promise<boolean> {
    try {
      await apiFetch(`/api/user/trackers?id=${id}`, { method: "DELETE" });
      return true;
    } catch {
      await dialog.alert("Не вдалося прибрати трекер.", { tone: "danger" });
      return false;
    }
  }

  async function move(groupId: number | null): Promise<boolean> {
    try {
      await apiFetch("/api/user/trackers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, groupId }),
      });
      setTracker((current) => (current ? { ...current, groupId } : current));
      return true;
    } catch {
      await dialog.alert("Не вдалося змінити групу.", { tone: "danger" });
      return false;
    }
  }

  async function setPublic(isPublic: boolean): Promise<boolean> {
    try {
      await apiFetch("/api/user/trackers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublic }),
      });
      // Стан показуємо після відповіді: перемикач, який «зберігся» локально й
      // не зберігся на сервері, — гірший за вимкнений.
      setTracker((current) => (current ? { ...current, isPublic } : current));
      return true;
    } catch {
      await dialog.alert("Не вдалося змінити публічність.", { tone: "danger" });
      return false;
    }
  }

  return {
    tracker,
    groups,
    entries,
    endDay,
    loading,
    error,
    saving,
    reload,
    save,
    remove,
    archive,
    move,
    setPublic,
  };
}
