/**
 * `useCreateForm` — форма створення як **запис історії**.
 *
 * Форма належить екрану (нотатки, дошка, лист, контакт) і власної сторінки не
 * має. Але **факт «форма відкрита» мусить бути в адресі**, і не заради посилання:
 * у Telegram Mini App «закрити форму» — це найчастіше «назад» (жест або кнопка
 * системи), а «назад» — це крок по історії. З локальним прапорцем він не закривав
 * би форму, а **виходив би зі сторінки**: людина закриває створення нотатки й
 * опиняється там, звідки прийшла (а зійшовши з хабу «Створити» — на ньому ж).
 *
 * Тому відкриття форми — **новий запис** (`…?new=1`), а під ним мусить стояти
 * розділ. Його кладе хаб (`create-hub.ts`: спершу розділ, тоді форма) або
 * `openForm` із уже відкритого розділу. Закриття — **крок назад**: людина
 * вертається в розділ, з якого прийшла, а не виходить із нього.
 *
 * Звідси два правила, і обидва живуть тут:
 *
 * - `open` **виводиться з адреси**, а не тримається поруч у `useState`: два
 *   джерела одного факту розійшлися б — «назад» міняє адресу, а форма лишалася б
 *   висіти над розділом;
 * - закриття — крок назад **лише тоді, коли під формою справді є розділ** (запис
 *   позначено, `CREATE_FORM_STATE`). Намір, що прийшов посиланням або
 *   перезавантаженням, позначки не має, і «назад» звідти вивів би з продукту —
 *   тоді намір просто знімається з адреси, а людина лишається в розділі.
 *
 * @module web-platform-dev/src/app/useCreateForm
 */

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CREATE_FORM_STATE,
  isCreateFormEntry,
  readCreateIntent,
  withCreateIntent,
  withoutCreateIntent,
} from "./routes";

export interface CreateFormState {
  /** Форма відкрита. Правда одна — адреса. */
  open: boolean;
  /** Відкрити форму: адреса стає `…?new=1` — новим записом, що вказує на розділ. */
  openForm: () => void;
  /** Закрити форму: крок назад у розділ (або зняти намір, якщо запис чужий). */
  closeForm: () => void;
}

export function useCreateForm(): CreateFormState {
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const here = `${pathname}${search}`;
  const open = readCreateIntent(new URLSearchParams(search));

  const openForm = useCallback(() => {
    // Позначка їде разом із записом: вона й каже закриттю, що під формою — розділ.
    void navigate(withCreateIntent(here), { state: CREATE_FORM_STATE });
  }, [navigate, here]);

  const closeForm = useCallback(() => {
    if (!open) return;
    if (isCreateFormEntry(state)) {
      void navigate(-1);
      return;
    }
    void navigate(withoutCreateIntent(here), { replace: true });
  }, [open, state, navigate, here]);

  return { open, openForm, closeForm };
}
