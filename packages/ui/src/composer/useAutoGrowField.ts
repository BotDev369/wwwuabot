/**
 * Поле, яке росте за текстом.
 *
 * `resize: vertical` малює ручку лише на десктопі — жоден мобільний WebView її
 * не показує, а користуються композером з телефона. Тож «розтягнути» поле там
 * можна одним способом: дати йому вирости разом із текстом.
 *
 * Висоту міряємо від `auto` навмисно: інакше `scrollHeight` ніколи не меншає,
 * і поле, яке один раз виросло, назад уже не звужується.
 *
 * @module @wwwuabot/ui/composer
 */

import { useEffect, useRef, type RefObject } from "react";

export function useAutoGrowField(value: string): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [value]);

  return ref;
}
