/**
 * Скільки блоків дослідження — для рядка «Розвитку»; невдача дає `null`, не нуль.
 *
 * @module web-platform-dev/src/pages/assessments/useResearchBlocks
 */

import { useEffect, useState } from "react";
import { researchBlockCount } from "@wwwuabot/shared/research";
import { researchApi } from "@/shared/api/research.api";

export function useResearchBlocks(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    researchApi
      .catalog()
      .then((catalog) => {
        if (!cancelled) setCount(researchBlockCount(catalog));
      })
      .catch(() => {
        /* мовчки: рядок «Розвитку» працює й без числа */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
