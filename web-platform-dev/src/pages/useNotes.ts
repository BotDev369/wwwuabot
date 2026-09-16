/**
 * Свої нотатки — дані для екрана «МоїНотатки».
 *
 * Джерело — `GET /api/notes`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити
 * чужі нотатки. Сортування (свіжі згори) теж вирішує сервер — клієнт лише
 * показує те, що прийшло.
 *
 * @module web-platform-dev/src/pages/useNotes
 */

import { useEffect, useState } from "react";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { notesApi } from "@/shared/api/notes.api";

export interface NotesState {
  notes: NoteRow[];
  loading: boolean;
  error: string | null;
}

export function useNotes(): NotesState {
  const [state, setState] = useState<NotesState>({ notes: [], loading: true, error: null });

  useEffect(() => {
    // `cancelled` — не формальність: сторінку закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    notesApi
      .list()
      .then((notes) => {
        if (!cancelled) setState({ notes, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          notes: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити нотатки",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
