import { useEffect } from "react";

/**
 * Гарячі клавіші модалки: Escape закриває, Ctrl/Cmd+S зберігає.
 * `enabled = false` — поки триває збереження або завантаження.
 */
export function useScenarioShortcuts({
  onEscape,
  onSave,
  enabled,
}: {
  onEscape: () => void;
  onSave: () => void;
  enabled: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (enabled) onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, onSave, enabled]);
}
