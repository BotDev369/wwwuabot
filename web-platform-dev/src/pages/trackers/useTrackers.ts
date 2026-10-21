/**
 * Стрічка трекерів: список, групи-дерево, стандартні трекери з першого
 * входу і власні. Запис із матриці той самий, що й на сторінці трекера:
 * сервер ставить день, клієнт шле лише значення.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackers
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import {
  todayTrackerDay,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerFields,
  type TrackerGroup,
} from "@wwwuabot/shared/trackers";
import { apiFetch } from "@/shared/api/client";

interface TrackersPayload {
  trackers: Tracker[];
  groups: TrackerGroup[];
  entries: TrackerEntryRow[];
  endDay: string;
}

export interface TrackersState extends TrackersPayload {
  loading: boolean;
  /** Запис із матриці в польоті — форма тримає кнопку вимкненою. */
  saving: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (fields: TrackerFields, groupId?: number | null) => Promise<Tracker | null>;
  archive: (id: number) => Promise<boolean>;
  /** Запис із матриці: новий вимір, день ставить сервер. */
  save: (trackerId: number, value: number, note: string) => Promise<boolean>;
  move: (trackerId: number, groupId: number | null) => Promise<boolean>;
  createGroup: (title: string, parentId: number | null) => Promise<TrackerGroup | null>;
  updateGroup: (
    id: number,
    patch: { title?: string; parentId?: number | null },
  ) => Promise<boolean>;
  deleteGroup: (id: number) => Promise<boolean>;
}

export function useTrackers(): TrackersState {
  const dialog = useDialog();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [groups, setGroups] = useState<TrackerGroup[]>([]);
  const [entries, setEntries] = useState<TrackerEntryRow[]>([]);
  // День є **від першого кадру**: поки відповідь летить, список уже може
  // отримати трекер («+» форми не чекає завантаження), а порожній день
  // зламав би побудову серії (`addTrackerDays("")` — Invalid time value).
  const [endDay, setEndDay] = useState(() => todayTrackerDay());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      // День людини: у Telegram-таймзоні він може бути вже іншим, ніж у воркера.
      const result = await apiFetch<TrackersPayload>(`/api/user/trackers?day=${todayTrackerDay()}`);
      if (request !== generation.current) return;
      setTrackers(result.trackers);
      // Деплой котиться нерівно: прев'ю б'є в уже задеплоєний api-dev, і поки
      // він старий — відповіді без `groups`. Сторінка чекає на дерево, а не падає.
      setGroups(result.groups ?? []);
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

  async function create(
    fields: TrackerFields,
    groupId: number | null = null,
  ): Promise<Tracker | null> {
    try {
      const result = await apiFetch<{ tracker: Tracker }>("/api/user/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, groupId }),
      });
      setTrackers((current) => [...current, result.tracker]);
      return result.tracker;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося створити трекер.", { tone: "danger" });
      return null;
    }
  }

  /** Запис із клітинки матриці: той самий `POST entry`, що й на сторінці. */
  async function save(trackerId: number, value: number, note = ""): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      const result = await apiFetch<{ entry: TrackerEntry }>("/api/user/trackers/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackerId, value, note }),
      });
      setEntries((current) => [...current, { ...result.entry, trackerId }]);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося зберегти запис.", { tone: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function move(trackerId: number, groupId: number | null): Promise<boolean> {
    try {
      await apiFetch("/api/user/trackers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trackerId, groupId }),
      });
      setTrackers((current) =>
        current.map((tracker) => (tracker.id === trackerId ? { ...tracker, groupId } : tracker)),
      );
      return true;
    } catch {
      await dialog.alert("Не вдалося пересунути трекер.", { tone: "danger" });
      return false;
    }
  }

  async function createGroup(title: string, parentId: number | null): Promise<TrackerGroup | null> {
    try {
      const result = await apiFetch<{ group: TrackerGroup }>("/api/user/trackers/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentId }),
      });
      setGroups((current) => [...current, result.group]);
      return result.group;
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      await dialog.alert(message || "Не вдалося створити групу.", { tone: "danger" });
      return null;
    }
  }

  async function updateGroup(
    id: number,
    patch: { title?: string; parentId?: number | null },
  ): Promise<boolean> {
    try {
      const result = await apiFetch<{ group: TrackerGroup }>("/api/user/trackers/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      setGroups((current) => current.map((group) => (group.id === id ? result.group : group)));
      return true;
    } catch {
      await dialog.alert("Не вдалося змінити групу.", { tone: "danger" });
      return false;
    }
  }

  async function deleteGroup(id: number): Promise<boolean> {
    try {
      await apiFetch(`/api/user/trackers/group?id=${id}`, { method: "DELETE" });
      // Сервер піднімає дітей і трекери на місце батька, а верхній рівень
      // садить у «Свої»; клієнт повторює ту саму правду, а не вгадує її.
      const removed = groups.find((group) => group.id === id);
      const ownId = groups.find((group) => group.key === "own")?.id ?? null;
      const moved = removed?.parentId ?? ownId;
      setGroups((current) =>
        current
          .filter((group) => group.id !== id)
          .map((group) => (group.parentId === id ? { ...group, parentId: moved } : group)),
      );
      setTrackers((current) =>
        current.map((tracker) =>
          tracker.groupId === id ? { ...tracker, groupId: moved } : tracker,
        ),
      );
      return true;
    } catch {
      await dialog.alert("Не вдалося прибрати групу.", { tone: "danger" });
      return false;
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

  return {
    trackers,
    groups,
    entries,
    endDay,
    loading,
    saving,
    error,
    reload,
    create,
    archive,
    save,
    move,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
