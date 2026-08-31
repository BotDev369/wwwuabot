/**
 * Dynamic Admin Page — завантажує сценарій з scenarios-admin за codeword,
 * парсить page_data та рендерить через PageRenderer.
 *
 * Маршрут: /page-admin/:codeword
 */

import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import type {
  PageConfig,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";

registerAllBlocks();

interface ScenarioData {
  codeword: string;
  title?: string;
  photo_url?: string;
  pageData?: PageConfig;
}

type PageStatus = "loading" | "ready" | "not-found" | "error";

export function DynamicAdminPage() {
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
        const res = await fetch("/api/admin/scenarios/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ codeword }),
        });
        if (cancelled) return;

        if (!res.ok) {
          setStatus("not-found");
          return;
        }

        const data = (await res.json()) as {
          success: boolean;
          data?: {
            codeword: string;
            title?: string;
            photo_url?: string;
            page_data?: string;
          };
          error?: string;
        };

        if (!data.success || !data.data) {
          setStatus("not-found");
          return;
        }

        const row = data.data;
        let pageConfig: PageConfig | null = null;

        if (row.page_data) {
          try {
            const parsed = JSON.parse(row.page_data);
            if (parsed && typeof parsed === "object" && "zones" in parsed) {
              pageConfig = parsed as PageConfig;
            }
          } catch {
            // invalid JSON
          }
        }

        if (!pageConfig) {
          setStatus("not-found");
          return;
        }

        if (!cancelled) {
          setScenario({
            codeword: row.codeword,
            title: row.title,
            photo_url: row.photo_url,
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

  const context: BlockContext = useMemo(
    () => ({
      codeword: scenario?.codeword ?? codeword ?? "",
      title: scenario?.title ?? null,
      photoUrl: scenario?.photo_url ?? null,
    }),
    [scenario, codeword],
  );

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
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 48, marginBottom: 8 }}>404</h1>
        <p>Сторінку не знайдено</p>
        <p style={{ fontSize: 12, opacity: 0.5 }}>Codeword: {codeword}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>Помилка</h1>
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (!scenario?.pageData) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>404</h1>
        <p>Конфігурація сторінки відсутня</p>
      </div>
    );
  }

  return (
    <PageRenderer
      config={scenario.pageData}
      context={context}
      className="page-layout"
    />
  );
}
