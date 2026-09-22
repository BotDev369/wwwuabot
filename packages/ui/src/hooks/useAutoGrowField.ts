/**
 * Поле, яке росте за текстом — але не вище за стелю рядків.
 *
 * `resize: vertical` малює ручку лише на десктопі: жоден мобільний WebView її
 * не показує, а користуються композером з телефона. Тож «розтягнути» поле там
 * можна одним способом: дати йому вирости разом із текстом.
 *
 * Дві межі, і обидві не випадкові:
 *
 * - **стеля рядків** — нотатка не має з'їдати екран; вище неї поле прокручується;
 * - **те, що людина розтягла руками, не звужуємо** — інакше перша ж літера
 *   повертала б розмір, який вона щойно задала мишкою.
 *
 * Висоту міряємо від `auto` навмисно: інакше `scrollHeight` ніколи не меншає.
 *
 * @module @wwwuabot/ui/hooks
 */

import { useEffect, useRef, type RefObject } from "react";

/** Висота рядків плюс внутрішні відступи — те, у чому міряється стеля. */
function capHeight(field: HTMLTextAreaElement, rows: number): number {
  const style = getComputedStyle(field);
  const line = Number.parseFloat(style.lineHeight);
  const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return rows * line + padding;
}

export function useAutoGrowField(
  value: string,
  maxRows = 3,
): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null);
  /** Висота, яку поставив сам хук: усе інше — рука людини. */
  const auto = useRef<number | null>(null);

  useEffect(() => {
    const field = ref.current;
    if (!field) return;

    const shown = field.offsetHeight;
    const byHand = auto.current !== null && Math.abs(shown - auto.current) > 1 ? shown : 0;

    field.style.height = "auto";
    const content = Math.max(field.scrollHeight, capHeight(field, 1));

    const next =
      byHand > 0 ? Math.max(content, byHand) : Math.min(content, capHeight(field, maxRows));

    field.style.height = `${next}px`;
    auto.current = next;
  }, [value, maxRows]);

  return ref;
}
