/**
 * Чи малювати бічну панель згорнутою.
 *
 * На мобільному — ніколи: там панель стає drawer'ом шириною `--drawer-w`,
 * і самі іконки без підписів у ньому нечитабельні. Вибір «згорнуто»
 * користувач робив на десктопі, і він зберігається — просто не застосовується
 * на вузькому екрані.
 */
import { useIsMobile } from "../useIsMobile";
import { useSidebar } from "./useSidebar";

export function useCollapsedNav(): boolean {
  const isMobile = useIsMobile();
  const collapsed = useSidebar((state) => state.collapsed);
  return collapsed && !isMobile;
}
