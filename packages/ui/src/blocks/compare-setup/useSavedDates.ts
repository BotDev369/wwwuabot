/**
 * Збережені дати кроку «субʼєкт»: той самий `/api/my-dates`, що й бібліотека дат.
 * Дата впізнається парою «дата + вид»: день народження й подія того самого дня —
 * різні субʼєкти, і перезапис одного іншим стер би інший.
 *
 * @module packages/ui/src/blocks/compare-setup/useSavedDates
 */

import { useCallback, useEffect, useState } from "react";
import type { MyDate } from "@wwwuabot/shared/types/mydate";
import { fetchMyDates, saveMyDate } from "../date-analysis/api";

export interface SavedEntry {
  date: string;
  name: string;
  notes: string;
  type: "person" | "event";
}

export interface SavedDatesState {
  dates: MyDate[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  /** Пише дату в бібліотеку: нову — POST, ту саму — PUT. */
  remember: (entry: SavedEntry) => Promise<boolean>;
}

export function useSavedDates(): SavedDatesState {
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDates(await fetchMyDates());
    } catch (e) {
      // Порожній список і «не завантажилось» — різні речі: без тексту людина
      // думала б, що збережених дат немає.
      setError(`Не вдалося завантажити збережені: ${String(e).slice(0, 80)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remember = useCallback(
    async (entry: SavedEntry) => {
      setSaving(true);
      setError(null);
      try {
        const existing = dates.find((d) => d.date === entry.date && d.type === entry.type);
        await saveMyDate({
          ...(existing ? { id: existing.id } : {}),
          date: entry.date,
          type: entry.type,
          name: entry.name,
          notes: entry.notes,
        });
        await refresh();
        return true;
      } catch (e) {
        setError(`Не вдалося зберегти дату: ${String(e).slice(0, 80)}`);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [dates, refresh],
  );

  return { dates, loading, error, saving, remember };
}
