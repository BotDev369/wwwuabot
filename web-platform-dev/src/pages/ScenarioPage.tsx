/**
 * ScenarioPage — єдиний рендерер усіх сторінок веб-платформи.
 *
 * Принцип (SD-1..SD-5): все, що відображається, береться ТІЛЬКИ зі
 * сценаріїв (`page_data` в D1). Захардкодені лишається ТІЛЬКИ фолбек
 * на випадок падіння доступу до бази/сценаріїв.
 *
 * Немає глобальних хедерів, сайдбарів, футерів, головної — усі 4 зони
 * (sidebar, header, main, footer) приходять із page_data сценарію.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { PageConfig, BlockContext, UserProfile } from "@wwwuabot/shared/types/page-config";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { apiFetchRaw } from "@/shared/api/client";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";

registerAllBlocks();

type PageStatus = "loading" | "ready" | "fallback" | "error";

/**
 * Фолбек-сторінка — ЄДИНИЙ дозволений хардкод.
 * Показується тільки коли сценарій недоступний (БД впала / мережа / 500).
 */
const FALLBACK_PAGE: PageConfig = {
  version: 1,
  zones: {
    header: [
      {
        id: "fallback-header",
        type: "text",
        order: 0,
        props: {
          title: "WWWUABot",
          level: "h3",
          align: "center",
        },
      },
    ],
    main: [
      {
        id: "fallback-main",
        type: "text",
        order: 0,
        props: {
          title: "Сторінка тимчасово недоступна",
          content: "Не вдалося завантажити вміст зі сценарію. Спробуйте оновити сторінку пізніше.",
          level: "body",
          align: "center",
        },
      },
    ],
    sidebar: [],
    footer: [],
  },
};

function LoadingScreen() {
  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
      <p>Завантаження…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="page-error">
      <h1>Помилка</h1>
      <p>{message}</p>
    </div>
  );
}

export function ScenarioPage() {
  // `*`-сплэт дає всі сегменти шляху; `__base__` — головна.
  const { ["*"]: splat } = useParams<{ "*": string }>();
  const scenarioSlug = splat && splat.length > 0 ? splat : "__base__";

  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);
  const [scenarioPhoto, setScenarioPhoto] = useState<string | null>(null);
  const [codeword, setCodeword] = useState<string>("__base__");
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // ── Завантаження профілю користувача (для conditional rendering) ──
  // Ідентичність api-dev бере з підписаного initData — query-параметр не потрібен.
  useEffect(() => {
    let cancelled = false;
    apiFetchRaw("/api/user/profile")
      .then((res) => res.json())
      .then((data: { ok?: boolean; user?: UserProfile }) => {
        if (!cancelled && data?.ok && data.user) setUserProfile(data.user);
      })
      .catch(() => {
        /* мовчки — conditional rendering просто не спрацює */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Завантаження сценарію ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setErrorMsg(null);
      try {
        const res = await apiFetchRaw(`/api/scenario/${encodeURIComponent(scenarioSlug)}`);
        if (cancelled) return;

        if (!res.ok) {
          // 404/500 від API — сценарій недоступний → фолбек.
          setStatus("fallback");
          return;
        }

        const data = (await res.json()) as {
          ok?: boolean;
          scenario?: { codeword?: string; title?: string; photo_url?: string };
          pageData?: unknown;
        };

        if (!data.ok || !data.scenario) {
          if (!cancelled) setStatus("fallback");
          return;
        }

        // Парсимо page_data (підтримує і старий slots-формат).
        let config: PageConfig | null = null;
        if (data.pageData) {
          config = parsePageConfig(
            typeof data.pageData === "string" ? data.pageData : JSON.stringify(data.pageData),
          );
        }

        if (!cancelled) {
          if (config) {
            setPageConfig(config);
            setScenarioTitle(data.scenario.title ?? null);
            setScenarioPhoto(data.scenario.photo_url ?? null);
            setCodeword(data.scenario.codeword ?? scenarioSlug);
            setStatus("ready");
          } else {
            // Сценарій існує, але page_data порожня — теж фолбек.
            setStatus("fallback");
          }
        }
      } catch (e) {
        if (!cancelled) {
          // Мережева помилка / БД недоступна → фолбек.
          setErrorMsg((e as Error).message);
          setStatus("fallback");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scenarioSlug]);

  // ── Контекст для блоків ──────────────────────────────────────────
  const context: BlockContext = useMemo(
    () => ({
      codeword,
      title: scenarioTitle,
      photoUrl: scenarioPhoto,
      user: userProfile ?? undefined,
      isOwner: userProfile?.role === "owner" || userProfile?.role === "admin",
    }),
    [codeword, scenarioTitle, scenarioPhoto, userProfile],
  );

  if (status === "loading") return <LoadingScreen />;
  if (status === "error") return <ErrorScreen message={errorMsg ?? "Unknown"} />;

  const activeConfig = status === "fallback" ? FALLBACK_PAGE : pageConfig;
  if (!activeConfig) return <LoadingScreen />;

  return (
    <PageRenderer
      config={activeConfig}
      context={
        status === "fallback" ? { codeword: "__base__", title: null, photoUrl: null } : context
      }
      className="page-layout"
    />
  );
}
