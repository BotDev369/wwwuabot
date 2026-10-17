/**
 * Стрічка трекерів: список, стандартні трекери з першого входу і власні.
 *
 * Числа рядків рахує `trackers-view` з тих самих записів, тож окремого запиту
 * «скільки за сьогодні» немає — смуга й список читають одне джерело.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackers
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import {
  todayTrackerDay,
  type Tracker,
  type TrackerEntryRow,
  type TrackerFields,
} from "@wwwuabot/shared/trackers";
import { apiFetch } from "@/shared/api/client";

interface TrackersPayload {
  trackers: Tracker[];
  entries: TrackerEntryRow[];
  endDay: string;
}

export interface TrackersState extends TrackersPayload {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (fields: TrackerFields) => Promise<Tracker | null>;
  archive: (id: number) => Promise<boolean>;
}

export function useTrackers(): TrackersState {
  const dialog = useDialog();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [entries, setEntries] = useState<TrackerEntryRow[]>([]);
  const [endDay, setEndDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      // День людини: у Telegram-таймзоні він може бути вже іншим, ніж у воркера.
      const result = await apiFetch<TrackersPayload>(`/api/user/trackers?day=${todayTrackerDay()}`);
      if (request !== generation.current) return;
      setTrackers(result.trackers);
      setEntries(result.entries);
      setEndDay(result.endDay);
      setError(null);
    } catch {
      if (request === generation.current) setError("Не вдалося завантажити трекери.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

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

  async function create(fields: TrackerFields): Promise<Tracker | null> {
    try {
      const result = await apiFetch<{ tracker: Tracker }>("/api/user/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      setTrackers((current) => [...current, result.tracker]);
      return result.tracker;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося створити трекер.", { tone: "danger" });
      return null;
    }
  }

  async function archive(id: number): Promise<boolean> {
    try {
      await apiFetch(`/api/user/trackers?id=${id}`, { method: "DELETE" });
      setTrackers((current) => current.filter((tracker) => tracker.id !== id));
      return true;
    } catch {
      await dialog.alert("Не вдалося прибрати трекер.", { tone: "danger" });
      return false;
    }
  }

  return { trackers, entries, endDay, loading, error, reload, create, archive };
}
