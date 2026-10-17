/**
 * Один трекер: історія днів, запис дня й прибирання.
 *
 * Запис править той самий рядок дня (upsert), тож локальний стан замінює день,
 * а не додає другий.
 *
 * @module web-platform-dev/src/pages/trackers/useTracker
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { todayTrackerDay, type Tracker, type TrackerEntry } from "@wwwuabot/shared/trackers";
import { apiFetch } from "@/shared/api/client";

interface TrackerPayload {
  tracker: Tracker;
  entries: TrackerEntry[];
  endDay: string;
}

export interface TrackerState {
  tracker: Tracker | null;
  entries: TrackerEntry[];
  endDay: string;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => Promise<void>;
  save: (day: string, value: number, note: string) => Promise<boolean>;
  remove: (day: string) => Promise<boolean>;
  archive: () => Promise<boolean>;
}

export function useTracker(id: number): TrackerState {
  const dialog = useDialog();
  const [tracker, setTracker] = useState<Tracker | null>(null);
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

  async function save(day: string, value: number, note: string): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const result = await apiFetch<{ entry: TrackerEntry }>("/api/user/trackers/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackerId: id, day, value, note }),
      });
      setEntries((current) => {
        const rest = current.filter((entry) => entry.day !== day);
        return [...rest, result.entry].sort((a, b) => (a.day < b.day ? -1 : 1));
      });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося зберегти запис.", { tone: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(day: string): Promise<boolean> {
    try {
      await apiFetch(`/api/user/trackers/entry?trackerId=${id}&day=${day}`, { method: "DELETE" });
      setEntries((current) => current.filter((entry) => entry.day !== day));
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

  return { tracker, entries, endDay, loading, error, saving, reload, save, remove, archive };
}
