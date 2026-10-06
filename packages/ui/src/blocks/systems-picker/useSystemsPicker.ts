/**
 * Стан кроку «вибір систем і параметрів» — спільний для аналізу й співставлення.
 *
 * Тут вибір і адреса наступного кроку, рендеринг — у `SystemsPicker`. Вибір їде
 * параметрами (`?sys=`, `?p=`), бо `ScenarioPage` бере весь splat як slug.
 *
 * @module packages/ui/src/blocks/systems-picker/useSystemsPicker
 */

import { useCallback, useEffect, useState } from "react";
import { fetchSystems, type AnalysisSystem } from "../mydate/api";

/** Куди веде крок: ім'я параметра зі значеннями (дати) і адреса результату. */
export interface SystemsPickerTarget {
  /** Ім'я параметра, під яким їдуть дати: `dates` у співставленні, `date` в аналізі. */
  valueParam: string;
  /** Самі дати через кому — уже прочитані тим блоком, який знає свій формат. */
  values: string;
  targetUrl: string;
  systemParam: string;
  parameterParam: string;
}

export interface SystemsPickerState {
  systems: AnalysisSystem[];
  selected: Record<string, Record<string, boolean>>;
  isSystemSelected: (id: string) => boolean;
  toggleSystem: (id: string, value: boolean) => void;
  toggleParam: (id: string, key: string, value: boolean) => void;
  /** Крок можна зробити лише з обраною системою: порожній вибір нікуди не веде. */
  ready: boolean;
  confirm: () => void;
}

export function useSystemsPicker(target: SystemsPickerTarget): SystemsPickerState {
  const { valueParam, values, targetUrl, systemParam, parameterParam } = target;

  const [systems, setSystems] = useState<AnalysisSystem[]>([]);
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    fetchSystems().then((list) => {
      setSystems(list);
      const initial: Record<string, Record<string, boolean>> = {};
      for (const system of list) {
        if (!system.implemented) continue;
        initial[system.id] = {};
        for (const parameter of system.parameters ?? []) initial[system.id][parameter.key] = true;
      }
      setSelected(initial);
    });
  }, []);

  const isSystemSelected = useCallback(
    (id: string) => Object.values(selected[id] ?? {}).some(Boolean),
    [selected],
  );

  const toggleSystem = useCallback(
    (id: string, value: boolean) => {
      setSelected((previous) => {
        const next = { ...previous, [id]: { ...(previous[id] ?? {}) } };
        const system = systems.find((item) => item.id === id);
        for (const parameter of system?.parameters ?? []) next[id][parameter.key] = value;
        return next;
      });
    },
    [systems],
  );

  const toggleParam = useCallback((id: string, key: string, value: boolean) => {
    setSelected((previous) => ({
      ...previous,
      [id]: { ...(previous[id] ?? {}), [key]: value },
    }));
  }, []);

  const ready = values !== "" && systems.some((s) => s.implemented && isSystemSelected(s.id));

  const confirm = useCallback(() => {
    const chosenSystems = systems
      .filter((system) => system.implemented && isSystemSelected(system.id))
      .map((system) => system.id);
    // Параметри збираються з усіх систем: однаковий ключ двічі — це одне ім'я,
    // бо результат читає їх як перелік, а не як пари «система — параметр».
    const chosenParams = Array.from(
      new Set(
        systems.flatMap((system) =>
          (system.parameters ?? [])
            .filter((parameter) => selected[system.id]?.[parameter.key])
            .map((parameter) => parameter.key),
        ),
      ),
    );

    const query = new URLSearchParams();
    query.set(valueParam, values);
    if (chosenSystems.length) query.set(systemParam, chosenSystems.join(","));
    if (chosenParams.length) query.set(parameterParam, chosenParams.join(","));
    window.location.href = `${targetUrl}?${query.toString()}`;
  }, [
    isSystemSelected,
    parameterParam,
    selected,
    systemParam,
    systems,
    targetUrl,
    valueParam,
    values,
  ]);

  return { systems, selected, isSystemSelected, toggleSystem, toggleParam, ready, confirm };
}
