/**
 * Стан виїзного меню (drawer) на мобільному.
 *
 * Живе окремо від `useSidebar`: «згорнуто» — це збережене налаштування
 * десктопа, а `open` — тимчасовий стан одного дотику, який не має переживати
 * перезавантаження сторінки.
 */
import { useCallback, useEffect, useState } from "react";

export interface MobileNav {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export function useMobileNav(): MobileNav {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return { open, toggle, close };
}
