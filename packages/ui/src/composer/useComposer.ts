/**
 * Стан композера: активна вкладка, чернетка нотатки, її хештеги й збереження.
 *
 * Хук без JSX (правило кристалевості): компонент лише малює те, що тут
 * лежить. Вставка з буфера теж тут, бо це логіка з помилкою, а не розмітка:
 * у Telegram WebView доступ до буфера часто закритий, і користувач мусить
 * побачити причину, а не тишу.
 *
 * **Збереження теж тут, але без адреси.** Куди саме ляже нотатка — знає
 * оболонка: у платформі це нотатка людини, у панелі — нотатка проєкту. Тому
 * хук приймає готовий обробник, а не кличe `fetch` сам: композер спільний, і
 * API-клієнта в нього немає (AGENTS.md §3).
 *
 * @module @wwwuabot/ui/composer
 */

import { useCallback, useState } from "react";
import { findComposerTab, DEFAULT_COMPOSER_TAB } from "./tabs";
import { addTags, removeTag } from "@wwwuabot/shared/notes";
import type { NoteDraft } from "@wwwuabot/shared/notes";
import type { ComposerTab } from "./types";

export interface UseComposerOptions {
  /** Зберегти нотатку. Помилку хук показує так само, як помилку вставки. */
  onSaveNote: (draft: NoteDraft) => Promise<void>;
  /**
   * Чернетка, з якої почати: є `id` — це редагування існуючої нотатки.
   *
   * Початковий стан береться з неї **один раз**, у `useState`: композер —
   * чернетка, яку людина вже почала правити, і повторне підставляння ззовні
   * затерло б її на кожен перемальовування батька.
   */
  initial?: NoteDraft;
  /**
   * З якої вкладки відкрити. Потрібно тоді, коли композер кличуть **за ділом**
   * (дошка оголошень відкриває його на вкладці «Оголошення»), а не «створити
   * щось»: підставляти потрібну вкладку дотиком за людину — це ще один
   * зайвий рух.
   */
  initialTab?: string;
}

export interface ComposerState {
  /** Активна вкладка (завжди існує — типова, якщо ключ невідомий). */
  tab: ComposerTab;
  selectTab: (key: string) => void;
  /** Текст нотатки. */
  note: string;
  setNote: (value: string) => void;
  /** Хештеги нотатки — те, за чим її потім знайдуть. */
  tags: readonly string[];
  addTags: (raw: string) => void;
  removeTag: (tag: string) => void;
  /** Дописати текст із буфера обміну в кінець нотатки. */
  paste: () => Promise<void>;
  /** Причина, чому вставка або збереження не вдались. */
  error: string | null;
  /** Чи триває збереження (кнопка в цей час не натискається вдруге). */
  saving: boolean;
  /** Зберегти; `true` — вдалось (композер тоді закривається). */
  save: () => Promise<boolean>;
  /** Номер нотатки, яку редагують; `undefined` — створюємо нову. */
  editingId: number | undefined;
}

export function useComposer({
  onSaveNote,
  initial,
  initialTab,
}: UseComposerOptions): ComposerState {
  // Невідомий ключ дає типову вкладку (`findComposerTab`), тож порожнього
  // екрана не буде навіть якщо хтось передасть вигаданий ключ.
  const [key, setKey] = useState(initialTab ?? DEFAULT_COMPOSER_TAB);
  const [note, setNote] = useState(initial?.text ?? "");
  const [tags, setTags] = useState<readonly string[]>(initial?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("У буфері обміну немає тексту.");
        return;
      }
      // Дописуємо, а не перезаписуємо: нотатка може бути вже почата.
      setNote((prev) => (prev ? `${prev}${text}` : text));
      setError(null);
    } catch {
      setError("Браузер не дав доступу до буфера обміну — вставте вручну.");
    }
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      // `id` додаємо лише при редагуванні: новий запис без нього — це те, як
      // сервер відрізняє створення від правки.
      await onSaveNote({
        ...(initial?.id ? { id: initial.id } : {}),
        text: note,
        tags: [...tags],
      });
      setError(null);
      return true;
    } catch (e: unknown) {
      // Причину показуємо як є: «не вдалося» без нічого — це та сама тиша,
      // від якої ми тікали, коли відмовлялись від нативних діалогів (§4).
      setError(e instanceof Error ? e.message : "Не вдалося зберегти нотатку.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onSaveNote, note, tags, initial?.id]);

  return {
    tab: findComposerTab(key),
    selectTab: setKey,
    note,
    setNote,
    tags,
    // Повертаємо той самий масив, якщо нічого не змінилось, — зайвих
    // перемальовувань на кожен пробіл не буде (див. `tags.ts`).
    addTags: (raw: string) => setTags((prev) => addTags(prev, raw)),
    removeTag: (tag: string) => setTags((prev) => removeTag(prev, tag)),
    paste,
    error,
    saving,
    save,
    editingId: initial?.id,
  };
}
