/**
 * PageBuilderInline — вбудований конструктор сторінок для картки сценарію.
 *
 * На відміну від PageBuilderPage, не завантажує/зберігає самостійно —
 * працює з зовнішнім станом (config + onChange).
 */

import { useMemo, useCallback, useState } from "react";
import type {
  PageConfig,
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import { getDefaultProps } from "@wwwuabot/shared/constants/block-definitions";
import { ZoneEditor } from "./ZoneEditor";
import { AddBlockModal } from "./AddBlockModal";
import { EmptyPageState } from "./EmptyPageState";
import { ZoneAddModal } from "./ZoneAddModal";

// ─── Helpers ────────────────────────────────────────────────────────

function isPageEmpty(config: PageConfig): boolean {
  for (const zone of ALL_ZONES) {
    if (config.zones[zone] && config.zones[zone].length > 0) return false;
  }
  return true;
}

function getActiveZones(config: PageConfig): BlockZone[] {
  if (Array.isArray(config.visibleZones)) {
    return config.visibleZones.filter((z): z is BlockZone => ALL_ZONES.includes(z as BlockZone));
  }
  if (config.zones.main && config.zones.main.length > 0) return ["main"];
  return [];
}

// ─── Props ──────────────────────────────────────────────────────────

interface Props {
  config: PageConfig;
  onChange: (config: PageConfig) => void;
  codeword: string;
  title?: string | null;
  photoUrl?: string | null;
}

// ─── Main Component ─────────────────────────────────────────────────

export function PageBuilderInline({ config, onChange, codeword, title, photoUrl }: Props) {
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [targetZone, setTargetZone] = useState<BlockZone | null>(null);

  const context: BlockContext = useMemo(
    () => ({ codeword, title: title ?? null, photoUrl: photoUrl ?? null }),
    [codeword, title, photoUrl],
  );

  const empty = useMemo(() => isPageEmpty(config), [config]);
  const activeZones = useMemo(() => getActiveZones(config), [config]);

  const [expandedZones, setExpandedZones] = useState<Set<BlockZone>>(() => new Set());

  const handleToggleZone = useCallback((zone: BlockZone) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone); else next.add(zone);
      return next;
    });
  }, []);

  const allExpanded = useMemo(
    () => activeZones.length > 0 && activeZones.every((z) => expandedZones.has(z)),
    [activeZones, expandedZones],
  );

  const allCollapsed = useMemo(
    () => activeZones.every((z) => !expandedZones.has(z)),
    [activeZones, expandedZones],
  );

  const handleExpandAll = useCallback(() => { setExpandedZones(new Set(activeZones)); }, [activeZones]);
  const handleCollapseAll = useCallback(() => { setExpandedZones(new Set()); }, []);

  const handleUpdateZoneBlocks = useCallback(
    (zone: BlockZone, blocks: PageBlock[]) => {
      onChange({ ...config, zones: { ...config.zones, [zone]: blocks } });
    },
    [config, onChange],
  );

  const handleAddZone = useCallback(
    (zone: BlockZone) => {
      const currentVisible = getActiveZones(config);
      if (currentVisible.includes(zone)) { setShowZoneModal(false); return; }
      onChange({ ...config, visibleZones: [...currentVisible, zone] });
      setExpandedZones((prev) => new Set([...prev, zone]));
      setShowZoneModal(false);
    },
    [config, onChange],
  );

  const openBlockModal = useCallback((zone: BlockZone) => {
    setTargetZone(zone);
    setShowBlockModal(true);
  }, []);

  const handleAddBlock = useCallback(
    (type: string) => {
      const zone = targetZone ?? "main";
      const newBlock: PageBlock = {
        id: generateBlockId(),
        type,
        order: (config.zones[zone]?.length ?? 0),
        props: getDefaultProps(type),
      };
      const currentVisible = getActiveZones(config);
      const updatedVisible = currentVisible.includes(zone) ? currentVisible : [...currentVisible, zone];
      onChange({
        ...config,
        visibleZones: updatedVisible,
        zones: { ...config.zones, [zone]: [...(config.zones[zone] ?? []), newBlock] },
      });
      setExpandedZones((prev) => new Set([...prev, zone]));
      setShowBlockModal(false);
      setTargetZone(null);
    },
    [config, onChange, targetZone],
  );

  const handleOpenBlockModalForZone = useCallback((zone: BlockZone) => openBlockModal(zone), [openBlockModal]);

  return (
    <div>
      {/* Empty state */}
      {empty && (
        <EmptyPageState
          onAddZone={() => setShowZoneModal(true)}
          onAddBlock={() => openBlockModal("main")}
        />
      )}

      {/* Zone header toolbar */}
      {!empty && activeZones.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
            Зони ({activeZones.length})
          </span>
          <div role="group" style={{ display: "inline-flex", alignItems: "center", background: "var(--bg-3)", borderRadius: 6, padding: 2, gap: 2, border: "1px solid var(--border)" }}>
            <button type="button" onClick={handleExpandAll}
              style={{ padding: "3px 8px", fontSize: 11, fontWeight: allExpanded ? 600 : 400, borderRadius: 4, border: "none", background: allExpanded ? "var(--accent, #6366f1)" : "transparent", color: allExpanded ? "#fff" : "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.15s ease" }}
              title="Розгорнути всі акордеони"
            >▾ Всі відкрито</button>
            <button type="button" onClick={handleCollapseAll}
              style={{ padding: "3px 8px", fontSize: 11, fontWeight: allCollapsed ? 600 : 400, borderRadius: 4, border: "none", background: allCollapsed ? "var(--accent, #6366f1)" : "transparent", color: allCollapsed ? "#fff" : "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "all 0.15s ease" }}
              title="Згорнути всі акордеони"
            >▸ Всі закрито</button>
          </div>
        </div>
      )}

      {/* Zone editors */}
      {!empty && activeZones.map((zone) => (
        <ZoneEditor
          key={zone}
          zone={zone}
          blocks={config.zones[zone]}
          context={context}
          onUpdateBlocks={handleUpdateZoneBlocks}
          onAddBlock={handleOpenBlockModalForZone}
          collapsed={!expandedZones.has(zone)}
          onToggleCollapse={() => handleToggleZone(zone)}
          sidebarSettings={config.sidebarSettings}
          onUpdateSidebarSettings={(newSettings) => { onChange({ ...config, sidebarSettings: newSettings }); }}
        />
      ))}

      {/* Empty active zones */}
      {empty && activeZones.map((zone) => (
        <div key={zone} style={{ border: "1px dashed var(--border)", borderRadius: 8, marginBottom: 10, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{zone}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Зона додана, але порожня</div>
          <button className="wb-btn wb-btn-secondary" onClick={() => openBlockModal(zone)} style={{ fontSize: 12, padding: "4px 12px" }}>+ Додати блок</button>
        </div>
      ))}

      {/* Add Zone button */}
      {!empty && activeZones.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
          <button className="wb-btn wb-btn-secondary" onClick={() => setShowZoneModal(true)} style={{ fontSize: 12, padding: "6px 16px" }}>+ Додати зону</button>
        </div>
      )}

      {/* Modals */}
      {showZoneModal && (
        <ZoneAddModal activeZones={activeZones} onSelect={handleAddZone} onClose={() => setShowZoneModal(false)} />
      )}
      {showBlockModal && (
        <AddBlockModal onSelect={handleAddBlock} onClose={() => { setShowBlockModal(false); setTargetZone(null); }} targetZone={targetZone} />
      )}
    </div>
  );
}
