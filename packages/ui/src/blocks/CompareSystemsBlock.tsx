/**
 * Page Builder — CompareSystemsBlock.
 *
 * Крок **співставлення**: дати з `?dates=`, далі результат `compare-table`.
 * Вибір систем і параметрів — спільний кирпичик `SystemsPicker`.
 *
 * @module packages/ui/src/blocks/CompareSystemsBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { SystemsPicker } from "./systems-picker";

export function CompareSystemsBlock({ block }: BlockComponentProps) {
  const {
    title = "Оберіть системи та параметри",
    resultUrl = "/mydate/compare/table",
    paramKey = "dates",
    systemKey = "sys",
    parameterKey = "p",
  } = block.props as {
    title?: string;
    resultUrl?: string;
    paramKey?: string;
    systemKey?: string;
    parameterKey?: string;
  };

  const dates = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramKey) ?? "";
    return raw.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  }, [paramKey]);

  return (
    <SystemsPicker
      className="wb-block-compare-systems"
      title={title}
      lead={`Дат для співставлення: ${dates.length}`}
      confirmLabel="Співставити"
      emptyText="Не знайдено дат для аналізу."
      valueParam={paramKey}
      values={dates.join(",")}
      targetUrl={resultUrl}
      systemParam={systemKey}
      parameterParam={parameterKey}
    />
  );
}
