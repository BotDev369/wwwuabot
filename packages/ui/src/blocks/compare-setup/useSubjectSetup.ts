/**
 * Стан кроку «кого або що аналізуємо»: ім'я й дата кожного суб'єкта. Вид їде
 * `kind`, імена — `labels`, власний аналіз — `self`. Усе це адреса, а не стан:
 * результат відкривається посиланням і мусить читатися без попередніх кроків.
 *
 * @module packages/ui/src/blocks/compare-setup/useSubjectSetup
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SELF_QUERY,
  SUBJECT_LABELS_QUERY,
  SUBJECT_QUERY,
  encodeLabels,
  encodeScopes,
  type AnalysisScope,
  type SubjectKind,
} from "@wwwuabot/shared/content";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";

/** Один суб'єкт у списку: ім'я може бути порожнім — тоді його підписує дата. */
export interface SubjectRow {
  date: string;
  name: string;
  kind: SubjectKind;
}

export interface SubjectSetupOptions {
  /** Вид усіх суб'єктів цієї сторінки; `mixed` — кожен обирає свій. */
  scope: AnalysisScope;
  nextUrl: string;
  /** Стеля суб'єктів: для одного аналізу — один, для порівняння — більше. */
  maxRows: number;
  /** Аналіз себе: одна дата, ім'я підставлене з профілю. */
  selfMode: boolean;
  /** Ім'я з профілю для режиму «себе»; без нього лишається поле. */
  initialName?: string;
  /** Збережена власна дата: підставляється, поки поле порожнє. */
  prefill?: { date: string; name: string; notes: string } | null;
}

export interface SubjectSetupState {
  rows: SubjectRow[];
  draftDate: string;
  draftName: string;
  draftKind: SubjectKind;
  /** Нотатка до власної дати: час, місто — те, що знадобиться пізніше. */
  notes: string;
  setNotes: (value: string) => void;
  setDraftDate: (value: string) => void;
  setDraftName: (value: string) => void;
  setDraftKind: (value: SubjectKind) => void;
  /** Додає набраного суб'єкта; повертає рядок, щоб його можна було зберегти. */
  add: () => SubjectRow | undefined;
  /** Додає готового суб'єкта — так обирають зі збережених. */
  addSubject: (row: SubjectRow) => void;
  /** Правка одного суб'єкта: у режимі «себе» рядок один, але він той самий. */
  update: (index: number, patch: Partial<SubjectRow>) => void;
  move: (index: number, direction: -1 | 1) => void;
  remove: (index: number) => void;
  /** Чи можна додати ще одного: потрібна валідна дата й вільне місце. */
  canAdd: boolean;
  /** Чи веде крок далі: без жодного суб'єкта аналізу немає. */
  canGo: boolean;
  goNext: () => void;
  /** Підпис кнопки додавання — різний для однієї людини й для списку. */
  addLabel: string;
}

/** Чи можна обирати вид у рядку: лише там, де в таблиці стоять обидва види. */
export function isMixedScope(scope: AnalysisScope): boolean {
  return scope === "mixed";
}

export function useSubjectSetup(options: SubjectSetupOptions): SubjectSetupState {
  const { scope, nextUrl, maxRows, selfMode, initialName, prefill } = options;
  const mixed = isMixedScope(scope);
  const fixedKind: SubjectKind = scope === "event" ? "event" : "person";

  const [rows, setRows] = useState<SubjectRow[]>(() =>
    selfMode ? [{ date: "", name: initialName?.trim() ?? "", kind: fixedKind }] : [],
  );
  const [draftDate, setDraftDate] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftKind, setDraftKind] = useState<SubjectKind>(fixedKind);
  const [notes, setNotes] = useState("");
  const prefilled = useRef(false);

  // Власну дату зберігають один раз, а питають щоразу: тому збережене
  // підставляється лише в порожнє поле, і правка людини його не перебиває.
  useEffect(() => {
    if (!prefill || prefilled.current || !isValidDate(prefill.date)) return;
    prefilled.current = true;
    setRows((previous) => {
      if (previous[0]?.date) return previous;
      return [{ date: prefill.date, name: prefill.name, kind: fixedKind }];
    });
    setNotes(prefill.notes);
  }, [fixedKind, prefill]);

  const addSubject = useCallback(
    (row: SubjectRow) => {
      if (rows.length >= maxRows) return;
      // Та сама дата — це той самий суб'єкт: два однакові стовпці нічого не додають.
      if (rows.some((item) => item.date === row.date)) return;
      setRows([...rows, row]);
    },
    [maxRows, rows],
  );

  const add = useCallback(() => {
    if (!isValidDate(draftDate)) return undefined;
    if (rows.length >= maxRows || rows.some((item) => item.date === draftDate)) return undefined;
    const row: SubjectRow = { date: draftDate, name: draftName.trim(), kind: draftKind };
    setRows([...rows, row]);
    setDraftDate("");
    setDraftName("");
    return row;
  }, [draftDate, draftKind, draftName, maxRows, rows]);

  const update = useCallback((index: number, patch: Partial<SubjectRow>) => {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const move = useCallback((index: number, direction: -1 | 1) => {
    setRows((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setRows((previous) => previous.filter((_, i) => i !== index));
  }, []);

  const canAdd = useMemo(
    () =>
      isValidDate(draftDate) &&
      rows.length < maxRows &&
      !rows.some((row) => row.date === draftDate),
    [draftDate, maxRows, rows],
  );

  const canGo = rows.some((row) => isValidDate(row.date));

  const goNext = useCallback(() => {
    const filled = rows.filter((row) => isValidDate(row.date));
    if (filled.length === 0) return;

    const query = new URLSearchParams();
    query.set("dates", filled.map((row) => row.date).join(","));
    query.set(SUBJECT_QUERY, encodeScopes(filled.map((row) => row.kind)));
    const labels = encodeLabels(filled.map((row) => row.name));
    if (labels) query.set(SUBJECT_LABELS_QUERY, labels);
    if (selfMode) query.set(SELF_QUERY, "1");
    window.location.href = `${nextUrl}?${query.toString()}`;
  }, [nextUrl, rows, selfMode]);

  return {
    rows,
    draftDate,
    draftName,
    draftKind: mixed ? draftKind : fixedKind,
    notes,
    setNotes,
    addSubject,
    setDraftDate,
    setDraftName,
    setDraftKind,
    add,
    update,
    move,
    remove,
    canAdd,
    canGo,
    goNext,
    addLabel: selfMode ? "Це я" : "Додати",
  };
}
