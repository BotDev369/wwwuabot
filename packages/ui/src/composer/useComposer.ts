/**
 * Стан композера: активна вкладка й чернетка нотатки.
 *
 * Хук без JSX (правило кристалевості): компонент лише малює те, що тут
 * лежить. Вставка з буфера теж тут, бо це логіка з помилкою, а не розмітка:
 * у Telegram WebView доступ до буфера часто закритий, і користувач мусить
 * побачити причину, а не тишу.
 *
 * @module @wwwuabot/ui/composer
 */

import { useCallback, useState } from "react";
import { findComposerTab, DEFAULT_COMPOSER_TAB } from "./tabs";
import type { ComposerTab } from "./types";

export interface ComposerState {
  /** Активна вкладка (завжди існує — типова, якщо ключ невідомий). */
  tab: ComposerTab;
  selectTab: (key: string) => void;
  /** Текст нотатки. */
  note: string;
  setNote: (value: string) => void;
  /** Дописати текст із буфера обміну в кінець нотатки. */
  paste: () => Promise<void>;
  /** Причина, чому вставка не вдалась. */
  error: string | null;
}

export function useComposer(): ComposerState {
  const [key, setKey] = useState(DEFAULT_COMPOSER_TAB);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return {
    tab: findComposerTab(key),
    selectTab: setKey,
    note,
    setNote,
    paste,
    error,
  };
}
