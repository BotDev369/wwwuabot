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
  periodLabel,
  presetWindowHours,
  rangeFromInputs,
  readAnalyticsView,
  refreshRange,
  rememberAnalyticsView,
  toDateTimeInput,
  type AnalyticsMode,
  type AnalyticsPeriod,
  type EventPresetKey,
  type EventRangeInput,
} from "./analytics-view";

export type { AnalyticsPeriod } from "./analytics-view";

export interface AnalyticsState {
  mode: AnalyticsMode;
  setMode: (mode: AnalyticsMode) => void;
  period: AnalyticsPeriod;
  applyPreset: (key: EventPresetKey) => void;
  /** Межі поточного діапазону для полів модалки. */
  rangeInput: { from: string; to: string };
  /** Підпис обраного періоду — його показує кнопка, що відкриває модалку. */
  periodText: string;
  periodOpen: boolean;
  openPeriod: () => void;
  closePeriod: () => void;
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
  closeCleanup: () => void;
  reload: () => void;
  toggleUser: (userId: number) => void;
  loadMore: () => Promise<void>;
}

export function useAnalytics(): AnalyticsState {
  // Один знімок на монтування: перезавантаження вкладки не має закривати
  // акордеон і повертати режим до типового.
  const [restored] = useState(readAnalyticsView);
  const [mode, setMode] = useState<AnalyticsMode>(restored?.mode ?? "users");
  const [period, setPeriod] = useState<AnalyticsPeriod>(restored?.period ?? "day");
  const [range, setRange] = useState<EventRangeInput>(
    restored?.range ?? presetRange(presetWindowHours("day")),
  );
  const [periodOpen, setPeriodOpen] = useState(false);

  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(
    restored?.expandedUserId ?? null,
  );
  const [userEvents, setUserEvents] = useState<Record<number, UserEvent[]>>({});
  const [userTotals, setUserTotals] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [userRequestToken, setUserRequestToken] = useState(0);
  const [settledUserRequest, setSettledUserRequest] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  useEffect(() => {
    rememberAnalyticsView({ mode, period, range, expandedUserId });
  }, [mode, period, range, expandedUserId]);

  const userRequestKey =
    expandedUserId === null
      ? null
      : JSON.stringify([
          mode,
          expandedUserId,
          range.from,
          range.to,
          refreshToken,
          userRequestToken,
        ]);

  // Дії розгорнутої людини тягнуться окремо від зведення — і перечитуються,
  // коли змінився діапазон або натиснули «Оновити»: акордеон лишається
  // відкритим, а не скидає вигляд сторінки. Індикатор завантаження виводиться
  // з ключа запиту, тому ефект не мусить синхронно міняти стан під час запуску.
  useEffect(() => {
    const requestKey = userRequestKey;
    if (expandedUserId === null || mode !== "users" || requestKey === null) return;
    let cancelled = false;
    void fetchEvents({ ...range, userId: expandedUserId, limit: EVENT_PAGE_SIZE })
      .then((list) => {
        if (cancelled) return;
        setUserEvents({ [expandedUserId]: list.items });
        setUserTotals({ [expandedUserId]: list.total });
        setSettledUserRequest(requestKey);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSettledUserRequest(requestKey);
        setError(err instanceof Error ? err.message : "Не вдалось прочитати дії людини");
      });
    return () => {
      cancelled = true;
    };
  }, [expandedUserId, mode, range, userRequestKey]);

  const loadingUser =
    mode === "users" && userRequestKey !== null && userRequestKey !== settledUserRequest
      ? expandedUserId
      : null;

  /** Готовий проміжок у годинах; `null` — межи задані вручну. */
  const presetHours = period === "period" ? null : presetWindowHours(period);

  const applyPreset = useCallback((key: EventPresetKey) => {
    setPeriod(key);
    setRange(presetRange(presetWindowHours(key)));
    // Готовий проміжок застосовується дотиком — поверхня більше не потрібна.
    setPeriodOpen(false);
  }, []);

  const applyRange = useCallback((from: string, to: string) => {
    setPeriod("period");
    setRange(rangeFromInputs(from, to));
    setPeriodOpen(false);
  }, []);

  const reload = useCallback(() => {
    const next = refreshRange(range, presetHours);
    if (next !== range) setRange(next);
    setRefreshToken((token) => token + 1);
  }, [presetHours, range]);

  const toggleUser = useCallback((userId: number) => {
    setExpandedUserId((current) => (current === userId ? null : userId));
    setUserRequestToken((token) => token + 1);
  }, []);

  const changeMode = useCallback((nextMode: AnalyticsMode) => {
    setMode(nextMode);
    setUserRequestToken((token) => token + 1);
  }, []);

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
    setMode: changeMode,
    period,
    applyPreset,
    rangeInput: { from: toDateTimeInput(range.from), to: toDateTimeInput(range.to) },
    periodText: periodLabel(period),
    periodOpen,
    openPeriod: () => setPeriodOpen(true),
    closePeriod: () => setPeriodOpen(false),
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
    reload,
    toggleUser,
    loadMore,
  };
}
