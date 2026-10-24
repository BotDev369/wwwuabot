/**
 * Стан екрана «Аналітика»: діапазон, режим, зведення й список.
 *
 * Розгорнутий рядок тягне події людини окремо: інакше відкриття екрана
 * приносило б тисячі рядків, з яких видно один екран (AGENTS.md §3).
 *
 * @module web-admin-dev/src/pages/analytics/useAnalytics
 */

import { useCallback, useEffect, useState } from "react";
import type { EventSummary, UserEvent } from "@wwwuabot/shared/events";
import {
  fetchEventLogging,
  fetchEvents,
  fetchEventSummary,
  saveEventLogging,
} from "../../shared/api/events.api";
import {
  EVENT_PAGE_SIZE,
  mergeEvents,
  presetRange,
  presetWindowHours,
  rangeFromInputs,
  refreshRange,
  toDateTimeInput,
  type AnalyticsMode,
  type EventPresetKey,
  type EventRangeInput,
} from "./analytics-view";

/** Обраний період: готовий чип або межі, задані в модалці. */
export type AnalyticsPeriod = EventPresetKey | "period";

const INITIAL_PERIOD: AnalyticsPeriod = "day";
const INITIAL_RANGE = presetRange(presetWindowHours("day"));

export interface AnalyticsState {
  mode: AnalyticsMode;
  setMode: (mode: AnalyticsMode) => void;
  period: AnalyticsPeriod;
  applyPreset: (key: EventPresetKey) => void;
  /** Межі поточного діапазону для полів модалки. */
  rangeInput: { from: string; to: string };
  rangeOpen: boolean;
  openRange: () => void;
  closeRange: () => void;
  applyRange: (from: string, to: string) => void;
  range: EventRangeInput;
  summary: EventSummary | null;
  events: UserEvent[];
  listTotal: number;
  expandedUserId: number | null;
  userEvents: Record<number, UserEvent[]>;
  userTotals: Record<number, number>;
  loading: boolean;
  loadingUser: number | null;
  loadingMore: boolean;
  updatedAt: number | null;
  error: string | null;
  cleanupOpen: boolean;
  openCleanup: () => void;
  /** Сквозна деталізація: чи пише сервер кожен дотик. */
  fullLogging: boolean;
  savingSettings: boolean;
  setFullLogging: (full: boolean) => Promise<void>;
  closeCleanup: () => void;
  reload: () => void;
  toggleUser: (userId: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useAnalytics(): AnalyticsState {
  const [mode, setMode] = useState<AnalyticsMode>("users");
  const [period, setPeriod] = useState<AnalyticsPeriod>(INITIAL_PERIOD);
  const [range, setRange] = useState<EventRangeInput>(INITIAL_RANGE);
  const [rangeOpen, setRangeOpen] = useState(false);

  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userEvents, setUserEvents] = useState<Record<number, UserEvent[]>>({});
  const [userTotals, setUserTotals] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [fullLogging, setFullLoggingState] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedUserId(null);
    setUserEvents({});
    setUserTotals({});
    try {
      const next = await fetchEventSummary(range);
      setSummary(next);
      if (mode === "time") {
        const list = await fetchEvents({ ...range, limit: EVENT_PAGE_SIZE });
        setEvents(list.items);
        setListTotal(list.total);
      } else {
        setEvents([]);
        setListTotal(0);
      }
      setUpdatedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прочитати журнал");
    } finally {
      setLoading(false);
    }
  }, [mode, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load();
  }, [load, refreshToken]);

  // Налаштування читаються окремо від журналу: збій журналу не має ховати
  // перемикач, а збій налаштувань — журнал.
  useEffect(() => {
    let cancelled = false;
    void fetchEventLogging()
      .then((full) => {
        if (!cancelled) setFullLoggingState(full);
      })
      .catch(() => {
        if (!cancelled) setFullLoggingState(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const setFullLogging = useCallback(async (full: boolean) => {
    setFullLoggingState(full);
    setSavingSettings(true);
    try {
      setFullLoggingState(await saveEventLogging(full));
      setError(null);
    } catch (err) {
      // Перемикач повертається до того, що справді в базі: показане «увімкнено»
      // при вимкненому записі читалося б як «журнал працює», а його немає.
      setFullLoggingState(!full);
      setError(err instanceof Error ? err.message : "Не вдалось зберегти налаштування");
    } finally {
      setSavingSettings(false);
    }
  }, []);

  /** Готовий проміжок у годинах; `null` — межи задані вручну. */
  const presetHours = period === "period" ? null : presetWindowHours(period);

  const applyPreset = useCallback((key: EventPresetKey) => {
    setPeriod(key);
    setRange(presetRange(presetWindowHours(key)));
  }, []);

  const applyRange = useCallback((from: string, to: string) => {
    setPeriod("period");
    setRange(rangeFromInputs(from, to));
    setRangeOpen(false);
  }, []);

  const reload = useCallback(() => {
    const next = refreshRange(range, presetHours);
    if (next !== range) setRange(next);
    setRefreshToken((token) => token + 1);
  }, [presetHours, range]);

  const toggleUser = useCallback(
    async (userId: number) => {
      if (expandedUserId === userId) {
        setExpandedUserId(null);
        return;
      }
      setExpandedUserId(userId);
      if (userEvents[userId]) return;

      setLoadingUser(userId);
      try {
        const list = await fetchEvents({ ...range, userId, limit: EVENT_PAGE_SIZE });
        setUserEvents((prev) => ({ ...prev, [userId]: list.items }));
        setUserTotals((prev) => ({ ...prev, [userId]: list.total }));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалось прочитати дії людини");
      } finally {
        setLoadingUser(null);
      }
    },
    [expandedUserId, range, userEvents],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || events.length >= listTotal) return;
    setLoadingMore(true);
    try {
      const page = await fetchEvents({
        ...range,
        limit: EVENT_PAGE_SIZE,
        offset: events.length,
      });
      setEvents((prev) => mergeEvents(prev, page.items));
      setListTotal(page.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось догортати журнал");
    } finally {
      setLoadingMore(false);
    }
  }, [events.length, listTotal, loadingMore, range]);

  return {
    mode,
    setMode,
    period,
    applyPreset,
    rangeInput: { from: toDateTimeInput(range.from), to: toDateTimeInput(range.to) },
    rangeOpen,
    openRange: () => setRangeOpen(true),
    closeRange: () => setRangeOpen(false),
    applyRange,
    range,
    summary,
    events,
    listTotal,
    expandedUserId,
    userEvents,
    userTotals,
    loading,
    loadingUser,
    loadingMore,
    updatedAt,
    error,
    cleanupOpen,
    openCleanup: () => setCleanupOpen(true),
    closeCleanup: () => setCleanupOpen(false),
    fullLogging,
    savingSettings,
    setFullLogging,
    reload,
    toggleUser,
    loadMore,
  };
}
