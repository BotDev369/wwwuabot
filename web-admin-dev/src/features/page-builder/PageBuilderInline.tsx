/**
 * PageBuilderInline — вбудований конструктор сторінок для картки сценарію.
 *
 * На відміну від PageBuilderPage, не завантажує/зберігає самостійно —
 * працює з зовнішнім станом (config + onChange).
 */

import { useMemo, useCallback } from "react";
import type {
  PageConfig,
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { ZoneEditor } from "./ZoneEditor";

interface Props {
  config: PageConfig;
  onChange: (config: PageConfig) => void;
  codeword: string;
  title?: string | null;
  photoUrl?: string | null;
}

export function PageBuilderInline({
  config,
  onChange,
  codeword,
  title,
  photoUrl,
}: Props) {
  const context: BlockContext = useMemo(
    () => ({
      codeword,
      title: title ?? null,
      photoUrl: photoUrl ?? null,
    }),
    [codeword, title, photoUrl],
  );

  const handleUpdateZoneBlocks = useCallback(
    (zone: BlockZone, blocks: PageBlock[]) => {
      onChange({
        ...config,
        zones: { ...config.zones, [zone]: blocks },
      });
    },
    [config, onChange],
  );

  return (
    <div>
      {ALL_ZONES.map((zone) => (
        <ZoneEditor
          key={zone}
          zone={zone}
          blocks={config.zones[zone]}
          context={context}
          onUpdateBlocks={handleUpdateZoneBlocks}
        />
      ))}
    </div>
  );
}
