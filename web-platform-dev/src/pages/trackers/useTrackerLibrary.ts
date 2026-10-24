/**
 * Дві поверхні на читання: каталог («Шаблони») і чужі відкриті визначення
 * («Публічні»). Вантажаться лише коли їх відкрили (`enabled`): екран стартує
 * з «Моїх», і два зайві списки при вході — це плата мережею ні за що.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackerLibrary
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicTracker, TrackerTemplate } from "@wwwuabot/shared/trackers";
import { apiFetch } from "@/shared/api/client";
import { publicItems, templateItems, type TrackerLibraryItem } from "./tracker-library";

export interface TrackerLibraryState {
  templates: TrackerLibraryItem[];
  publicTrackers: TrackerLibraryItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useTrackerLibrary(enabled = true): TrackerLibraryState {
  const [rawTemplates, setRawTemplates] = useState<TrackerTemplate[]>([]);
  const [rawPublic, setRawPublic] = useState<PublicTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const started = useRef(false);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const [templates, published] = await Promise.all([
        apiFetch<{ templates: TrackerTemplate[] }>("/api/user/trackers/templates"),
        apiFetch<{ trackers: PublicTracker[] }>("/api/user/trackers/public"),
      ]);
      if (request !== generation.current) return;
      setRawTemplates(templates.templates);
      setRawPublic(published.trackers);
      setError(null);
    } catch {
      if (request === generation.current) setError("Не вдалося завантажити список.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void load();
  }, [enabled, load]);

  const templates = useMemo(() => templateItems(rawTemplates), [rawTemplates]);
  const publicTrackers = useMemo(() => publicItems(rawPublic), [rawPublic]);

  return {
    templates,
    publicTrackers,
    loading,
    error,
    reload: load,
  };
}
