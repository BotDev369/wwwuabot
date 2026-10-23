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
import { fetchEvents, fetchEventSummary } from "../../shared/api/events.api";
import {
  EVENT_PAGE_SIZE,
  mergeEvents,
  presetRange,
  rangeFromInputs,
  refreshRange,
  toDateTimeInput,
  type AnalyticsMode,
  type EventRangeInput,
} from "./analytics-view";

const INITIAL_HOURS = 24;
const INITIAL_RANGE = presetRange(INITIAL_HOURS);

export interface AnalyticsState {
  mode: AnalyticsMode;
  setMode: (mode: AnalyticsMode) => void;
  fromInput: string;
  toInput: string;
  setFromInput: (value: string) => void;
  setToInput: (value: string) => void;
  applyRange: () => void;
  applyPreset: (hours: number) => void;
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
  reload: () => void;
  toggleUser: (userId: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useAnalytics(): AnalyticsState {
  const [mode, setMode] = useState<AnalyticsMode>("users");
  const [range, setRange] = useState<EventRangeInput>(INITIAL_RANGE);
  const [fromInput, setFromInput] = useState(() => toDateTimeInput(INITIAL_RANGE.from));
  const [toInput, setToInput] = useState(() => toDateTimeInput(INITIAL_RANGE.to));

  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userEvents, setUserEvents] = useState<Record<number, UserEvent[]>>({});
  const [userTotals, setUserTotals] = useState<Record<number, number>>({});

  /** Готовий проміжок у годинах; `null` — межи задані вручну. */
  const [presetHours, setPresetHours] = useState<number | null>(INITIAL_HOURS);

  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const applyRange = useCallback(() => {
    setPresetHours(null);
    setRange(rangeFromInputs(fromInput, toInput));
  }, [fromInput, toInput]);

  const applyPreset = useCallback((hours: number) => {
    const next = presetRange(hours);
    setPresetHours(hours);
    setFromInput(toDateTimeInput(next.from));
    setToInput(toDateTimeInput(next.to));
    setRange(next);
  }, []);

  const reload = useCallback(() => {
    const next = refreshRange(range, presetHours);
    if (next !== range) {
      setFromInput(toDateTimeInput(next.from));
      setToInput(toDateTimeInput(next.to));
      setRange(next);
    }
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
    fromInput,
    toInput,
    setFromInput,
    setToInput,
    applyRange,
    applyPreset,
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
    reload,
    toggleUser,
    loadMore,
  };
}
