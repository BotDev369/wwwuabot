/**
 * Page Builder — головна сторінка конструктора сторінок.
 *
 * Завантажує сценарій за codeword, редагує page_data як конфігурацію
 * з 4 зон (sidebar, header, main, footer), зберігає назад в D1.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  readScenarioAll,
  updateScenarioFields,
} from "../../shared/api/scenarios.api";
import type {
  PageConfig,
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { createEmptyPageConfig } from "@wwwuabot/shared/types/page-config";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { ZoneEditor } from "./ZoneEditor";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function PageBuilderPage() {
  const { codeword } = useParams<{ codeword: string }>();
  const navigate = useNavigate();

  const [config, setConfig] = useState<PageConfig>(createEmptyPageConfig());
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);
  const [scenarioPhoto, setScenarioPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Контекст для блоків
  // Множина розгорнутих зон. За замовчуванням порожня (всі акордеони закриті).
  const [expandedZones, setExpandedZones] = useState<Set<BlockZone>>(() => new Set());

  const handleToggleZone = useCallback((zone: BlockZone) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  }, []);

  const allExpanded = useMemo(
    () => ALL_ZONES.length > 0 && ALL_ZONES.every((z) => expandedZones.has(z)),
    [expandedZones],
  );

  const allCollapsed = useMemo(
    () => ALL_ZONES.every((z) => !expandedZones.has(z)),
    [expandedZones],
  );

  const handleExpandAll = useCallback(() => {
    setExpandedZones(new Set(ALL_ZONES));
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedZones(new Set());
  }, []);

  const context: BlockContext = useMemo(
    () => ({
      codeword: codeword ?? "",
      title: scenarioTitle,
      photoUrl: scenarioPhoto,
    }),
    [codeword, scenarioTitle, scenarioPhoto],
  );

  // Завантаження сценарію
  useEffect(() => {
    if (!codeword) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword, "portal");
        if (cancelled) return;
        if (!row) {
          setError("Сценарій не знайдено");
          setLoading(false);
          return;
        }

        setScenarioTitle((row as Record<string, unknown>).title as string ?? null);
        setScenarioPhoto((row as Record<string, unknown>).photo_url as string ?? null);

        const raw = (row as Record<string, unknown>).page_data;
        const parsed =
          typeof raw === "string"
            ? parsePageConfig(raw)
            : typeof raw === "object" && raw !== null
              ? (raw as PageConfig)
              : null;

        if (parsed) {
          setConfig(parsed);
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeword]);

  // Збереження
  const handleSave = useCallback(async () => {
    if (!codeword) return;
    setSaveStatus("saving");
    try {
      await updateScenarioFields(codeword, { page_data: JSON.stringify(config) }, "portal");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveStatus("error");
      setError((e as Error).message);
    }
  }, [codeword, config]);

  // Оновлення блоків у зоні
  const handleUpdateZoneBlocks = useCallback(
    (zone: BlockZone, blocks: PageBlock[]) => {
      setConfig((prev) => ({
        ...prev,
        zones: { ...prev.zones, [zone]: blocks },
      }));
    },
    [],
  );

  // Експорт JSON
  const handleExport = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    // Також показуємо в JSON-режимі
    setJsonText(json);
    setJsonMode(true);
  }, [config]);

  // Імпорт JSON
  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object" && "zones" in parsed) {
        setConfig(parsed as PageConfig);
        setJsonMode(false);
        setJsonError(null);
      } else {
        setJsonError("JSON повинен містити поле 'zones'");
      }
    } catch {
      setJsonError("Невалідний JSON");
    }
  }, [jsonText]);

  // Кнопка "Назад"
  const handleBack = () => {
    navigate("/scenarios-v2");
  };

  if (!codeword) {
    return (
      <div style={{ padding: 20 }}>
        <p>Codeword не вказано</p>
        <button className="wb-btn wb-btn-secondary" onClick={handleBack}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Заголовок */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingTop: 16,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            🏗️ Page Builder: {codeword}
          </h2>
          {scenarioTitle && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              {scenarioTitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="wb-btn wb-btn-secondary"
            onClick={handleBack}
            style={{ fontSize: 13 }}
          >
            ← Назад
          </button>
          <button
            className="wb-btn wb-btn-secondary"
            onClick={() => setJsonMode(!jsonMode)}
            style={{ fontSize: 13 }}
          >
            {jsonMode ? "🏗️ Конструктор" : "🔧 JSON"}
          </button>
          <button
            className="wb-btn wb-btn-secondary"
            onClick={handleExport}
            style={{ fontSize: 13 }}
          >
            📋 Експорт
          </button>
          <button
            className="wb-btn wb-btn-primary"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            style={{ fontSize: 13 }}
          >
            {saveStatus === "saving"
              ? "Збереження…"
              : saveStatus === "saved"
                ? "✓ Збережено"
                : "💾 Зберегти"}
          </button>
        </div>
      </div>

      {/* Помилки */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--color-error-bg, #fef2f2)",
            border: "1px solid var(--color-error, #ef4444)",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: "var(--color-error, #ef4444)",
          }}
        >
          {error}
        </div>
      )}

      {/* Завантаження */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          Завантаження…
        </div>
      )}

      {/* JSON-режим */}
      {jsonMode && !loading && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <button
              className="wb-btn wb-btn-secondary"
              onClick={() => {
                setJsonText(JSON.stringify(config, null, 2));
                setJsonError(null);
              }}
              style={{ fontSize: 12 }}
            >
              🔄 Оновити з конструктора
            </button>
            <button
              className="wb-btn wb-btn-primary"
              onClick={handleImport}
              style={{ fontSize: 12 }}
            >
              📥 Застосувати JSON
            </button>
          </div>
          {jsonError && (
            <div
              style={{
                color: "var(--color-error, #ef4444)",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              {jsonError}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            style={{
              width: "100%",
              minHeight: 500,
              fontFamily: "monospace",
              fontSize: 13,
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 6,
              resize: "vertical",
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Конструктор */}
      {!jsonMode && !loading && (
        <div>
          {/* Toolbar with accordion switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              Зони ({ALL_ZONES.length})
            </span>

            {/* Перемикач: всі відкрито / всі закрито */}
            <div
              role="group"
              aria-label="Перемикач акордеонів"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--bg-secondary, #f1f5f9)",
                borderRadius: 6,
                padding: 2,
                gap: 2,
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={handleExpandAll}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: allExpanded ? 600 : 400,
                  borderRadius: 4,
                  border: "none",
                  background: allExpanded ? "var(--accent, #6366f1)" : "transparent",
                  color: allExpanded ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
                title="Розгорнути всі акордеони"
              >
                ▾ Всі відкрито
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: allCollapsed ? 600 : 400,
                  borderRadius: 4,
                  border: "none",
                  background: allCollapsed ? "var(--accent, #6366f1)" : "transparent",
                  color: allCollapsed ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
                title="Згорнути всі акордеони"
              >
                ▸ Всі закрито
              </button>
            </div>
          </div>

          {ALL_ZONES.map((zone) => (
            <ZoneEditor
              key={zone}
              zone={zone}
              blocks={config.zones[zone]}
              context={context}
              onUpdateBlocks={handleUpdateZoneBlocks}
              collapsed={!expandedZones.has(zone)}
              onToggleCollapse={() => handleToggleZone(zone)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
