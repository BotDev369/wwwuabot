/**
 * Чи вьюпорт зараз мобільний.
 *
 * Брейкпоінт той самий, що в CSS (`max-width: 768px`) і в drawer'і платформи
 * (`page-zone--sidebar`), щоб обидві оболонки перемикалися одночасно.
 *
 * Хук потрібен, бо на мобільному рішення ухвалюється в розмітці, а не в CSS:
 * згорнуте меню вимкнене, натомість з'являється hamburger і скрим.
 */
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
