/**
 * Стан прибирання: спершу `dryRun` (скільки підпадає), потім підтвердження
 * спільним діалогом — видалення незворотне, тож число видно до нього.
 *
 * @module web-admin-dev/src/pages/analytics/useEventCleanup
 */

import { useCallback, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { cleanupEvents } from "../../shared/api/events.api";
import {
  buildCleanupRequest,
  cleanupTargetLabel,
  initialCleanupForm,
  type CleanupForm,
} from "./cleanup-view";

export interface CleanupState {
  form: CleanupForm;
  update: (patch: Partial<CleanupForm>) => void;
  run: () => Promise<void>;
  busy: boolean;
  error: string | null;
}

export function useEventCleanup(
  range: { from: string; to: string },
  onDeleted: () => void,
): CleanupState {
  const dialog = useDialog();
  const [form, setForm] = useState<CleanupForm>(() => initialCleanupForm(range));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((patch: Partial<CleanupForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
  }, []);

  const run = useCallback(async () => {
    const built = buildCleanupRequest(form);
    if ("error" in built) {
      setError(built.error);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const preview = await cleanupEvents({ ...built.request, dryRun: true });
      const matched = preview.matched ?? 0;
      if (matched === 0) {
        await dialog.alert("Під ці ознаки не підпадає жодна подія", { title: "Нічого чистити" });
        return;
      }

      const confirmed = await dialog.confirm(
        `Видалити ${matched} подій? ${cleanupTargetLabel(built.request)}. Відновити їх буде неможливо.`,
        { title: "Очистити журнал", tone: "danger", confirmText: "Видалити" },
      );
      if (!confirmed) return;

      const done = await cleanupEvents(built.request);
      await dialog.alert(`Видалено ${done.deleted ?? 0} подій`, { title: "Журнал очищено" });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прибрати журнал");
    } finally {
      setBusy(false);
    }
  }, [dialog, form, onDeleted]);

  return { form, update, run, busy, error };
}
