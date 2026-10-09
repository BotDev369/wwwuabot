/**
 * Стан секції-акордеона: розгорнута вона типово.
 *
 * Типово розгорнута — навмисно: `useExpansion` типово згортає все, бо там
 * ідеться про рядки списку, а тут — про цілий блок сторінки, і відкривати
 * сторінку з трьох однакових підписів означало б ховати те, за чим прийшли.
 * @module packages/ui/src/blocks/collapsible-section/useCollapse
 */

import { useCallback, useState } from "react";

export interface UseCollapseReturn {
  open: boolean;
  toggle: () => void;
}

export function useCollapse(): UseCollapseReturn {
  const [open, setOpen] = useState(true);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  return { open, toggle };
}
