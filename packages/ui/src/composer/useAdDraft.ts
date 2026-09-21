import { useCallback, useState } from "react";
import { DEFAULT_AD_KIND, type AdDraft, type AdKind } from "@wwwuabot/shared/ads";

/**
 * Чернетка оголошення в композері.
 *
 * **Чому окремий хук, а не ще кілька полів у `useComposer`.** Нотатка — це
 * текст і хештеги; оголошення — вид, ціна, місто й прапорець показу. Змішавши
 * їх, одна форма перемальовувалась би на кожен символ іншої, а `useComposer`
 * переріс би межу кристалевості (AGENTS.md §3). Список вкладок спільний —
 * стан у кожної свій.
 *
 * **Куди саме ляже оголошення — знає оболонка.** Хук приймає готовий обробник,
 * а не кличе `fetch`: композер спільний, і API-клієнта в нього немає (§3).
 */
export interface UseAdDraftOptions {
  /** Немає обробника — вкладки «Оголошення» немає взагалі (так у панелі). */
  onSaveAd?: (draft: AdDraft) => Promise<void>;
  /** Чернетка, з якої почати: є `id` — це правка свого оголошення. */
  initial?: AdDraft;
}

export interface AdDraftState {
  draft: AdDraft;
  /** Змінити одне поле: решта лишається як була. */
  update: (patch: Partial<AdDraft>) => void;
  setKind: (kind: AdKind) => void;
  error: string | null;
  saving: boolean;
  /** Порожнє оголошення зберігати нема чого — кнопка вимкнена, а не падає 400-ю. */
  empty: boolean;
  /** Зберегти; `true` — вдалось (композер тоді закривається). */
  save: () => Promise<boolean>;
}

export function useAdDraft({ onSaveAd, initial }: UseAdDraftOptions): AdDraftState {
  const [draft, setDraft] = useState<AdDraft>(
    () =>
      initial ?? {
        kind: DEFAULT_AD_KIND,
        title: "",
        body: "",
        price: "",
        place: "",
        isActive: true,
      },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = useCallback((patch: Partial<AdDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const setKind = useCallback((kind: AdKind) => {
    setDraft((prev) => ({ ...prev, kind }));
  }, []);

  const empty = draft.title.trim() === "" && draft.body.trim() === "";

  const save = useCallback(async (): Promise<boolean> => {
    if (!onSaveAd) {
      setError("Створення оголошень тут недоступне.");
      return false;
    }

    setSaving(true);
    try {
      // `id` їде лише при правці: без нього сервер створює нове (так само,
      // як у нотатки).
      await onSaveAd(draft);
      setError(null);
      return true;
    } catch (e: unknown) {
      // Причину показуємо як є: «не вдалося» без нічого — це та сама тиша,
      // від якої ми тікали, коли відмовлялись від нативних діалогів (§4).
      setError(e instanceof Error ? e.message : "Не вдалося зберегти оголошення.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSaveAd, draft]);

  return { draft, update, setKind, error, saving, empty, save };
}
