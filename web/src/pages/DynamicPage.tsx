/**
 * Dynamic Page — завантажує сценарій за codeword з URL,
 * парсить page_data та рендерить через PageRenderer.
 *
 * Використовує catch-all маршрут /:codeword.
 * Якщо page_data відсутня — показує 404.
 */

import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import type {
  PageConfig,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";

import { registerAllBlocks } from "@wwwuabot/ui/blocks";

// Реєструємо блоки один раз при завантаженні модуля
registerAllBlocks();

interface ScenarioData {
  codeword: string;
  title?: string;
  photo_url?: string;
  pageData?: PageConfig;
  webConfig?: unknown;
}

type PageStatus = "loading" | "ready" | "not-found" | "error";

export function DynamicPage() {
  const { codeword } = useParams<{ codeword: string }>();
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!codeword) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const res = await fetch(`/api/scenario/${encodeURIComponent(codeword)}`);
        if (cancelled) return;

        if (!res.ok) {
          setStatus("not-found");
          return;
        }

        const data = await res.json() as {
          ok: boolean;
          scenario?: { codeword: string; web_slug?: string };
          pageData?: Record<string, unknown>;
          config?: unknown;
          error?: string;
        };

        if (!data.ok || !data.scenario) {
          setStatus("not-found");
          return;
        }

        // Парсимо page_data (пріоритет) або web_config (fallback)
        let pageConfig: PageConfig | null = null;
        if (data.pageData) {
          pageConfig = data.pageData as unknown as PageConfig;
        } else if (data.config && typeof data.config === "object") {
          // Fallback: старий web_config
          pageConfig = data.config as PageConfig;
        }

        if (!pageConfig) {
          setStatus("not-found");
          return;
        }

        if (!cancelled) {
          setScenario({
            codeword: data.scenario.codeword,
            pageData: pageConfig,
          });
          setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg((e as Error).message);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [codeword]);

  // Контекст для блоків
  const context: BlockContext = useMemo(
    () => ({
      codeword: scenario?.codeword ?? codeword ?? "",
      title: scenario?.title ?? null,
      photoUrl: scenario?.photo_url ?? null,
    }),
    [scenario, codeword],
  );

  // Стани
  if (status === "loading") {
    return (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <p>Завантаження…</p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="page-not-found">
        <h1>404</h1>
        <p>Сторінку не знайдено</p>
        <p className="text-sm text-muted-foreground">
          Codeword: {codeword}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-error">
        <h1>Помилка</h1>
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (!scenario?.pageData) {
    return (
      <div className="page-not-found">
        <h1>404</h1>
        <p>Конфігурація сторінки відсутня</p>
      </div>
    );
  }

  // Рендеримо сторінку через PageRenderer
  return (
    <PageRenderer
      config={scenario.pageData}
      context={context}
      className="page-layout"
    />
  );
}
