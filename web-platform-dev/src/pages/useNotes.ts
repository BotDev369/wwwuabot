/**
 * Свої нотатки — дані для екрана «МоїНотатки».
 *
 * Джерело — `GET /api/notes`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити
 * чужі нотатки. Сортування сервер віддає своє (свіжі згори), але вигляд списку
 * вирішує екран — тому порядок тут не «правильний» чи «неправильний», а
 * просто початковий.
 *
 * **Дані оновлюються локально, а не повторним запитом.** Сервер уже повертає
 * збережений рядок (`save`) і підтверджує зникнення (`remove`), тож другий
 * похід по весь список був би зайвим — і, головне, показав би людини те саме
 * з затримкою: список «блимнув» би завантаженням після кожного збереження.
 *
 * @module web-platform-dev/src/pages/useNotes
 */

import { useCallback, useEffect, useState } from "react";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { notesApi } from "@/shared/api/notes.api";

export interface NotesState {
  notes: NoteRow[];
  loading: boolean;
  error: string | null;
  /** Додати або замінити нотатку: збережений рядок — джерело правди. */
  upsert: (note: NoteRow) => void;
  /** Прибрати нотатку зі списку після видалення. */
  remove: (id: number) => void;
}

export function useNotes(): NotesState {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: сторінку закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    notesApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setNotes(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити нотатки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const upsert = useCallback((note: NoteRow) => {
    // Правка міняє `updated_at`, а він вирішує порядок — тож місце в списку
    // перерахує сам вигляд (сортування), а не цей хук.
    setNotes((prev) =>
      prev.some((item) => item.id === note.id)
        ? prev.map((item) => (item.id === note.id ? note : item))
        : [note, ...prev],
    );
  }, []);

  const remove = useCallback((id: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return { notes, loading, error, upsert, remove };
}
