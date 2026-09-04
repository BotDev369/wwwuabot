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
  UserProfile,
} from "@wwwuabot/shared/types/page-config";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";

import { registerAllBlocks } from "@wwwuabot/ui/blocks";

// Реєструємо блоки один раз при завантаженні модуля
registerAllBlocks();

const FALLBACK_PAGE_CONFIG: PageConfig = {
  version: 1,
  zones: {
    sidebar: [],
    header: [],
    main: [
      {
        id: "fallback-main",
        type: "text",
        order: 0,
        props: {
          title: "WWWUABot",
          content: "Сторінка тимчасово недоступна. Спробуйте ще раз пізніше.",
          level: "h1",
          align: "center",
        },
      },
    ],
    footer: [],
  },
  visibleZones: ["main"],
};

interface DynamicPageProps {
  /** Used by the root route to resolve the base platform scenario. */
  baseCodeword?: string;
}

interface ScenarioData {
  codeword: string;
  title?: string;
  photo_url?: string;
  pageData?: PageConfig;
  webConfig?: unknown;
}

type PageStatus = "loading" | "ready" | "not-found" | "error";

export function DynamicPage({ baseCodeword }: DynamicPageProps = {}) {
  const { codeword } = useParams<{ codeword: string }>();
  const requestedCodeword = baseCodeword ?? codeword;
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!requestedCodeword) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const res = await fetch(`/api/scenario/${encodeURIComponent(requestedCodeword)}`);
        if (cancelled) return;

        if (!res.ok) {
          setStatus("not-found");
          return;
        }

        const data = await res.json() as {
          ok: boolean;
          scenario?: { codeword: string; web_slug?: string };
          pageData?: Record<string, unknown>;
          error?: string;
        };

        if (!data.ok || !data.scenario) {
          setStatus("not-found");
          return;
        }

        // Парсимо page_data
        let pageConfig: PageConfig | null = null;
        if (data.pageData) {
          pageConfig = data.pageData as unknown as PageConfig;
        }
        if (!pageConfig && data.pageData) {
          pageConfig = parsePageConfig(JSON.stringify(data.pageData));
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
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedCodeword]);

  // Завантаження профілю користувача (для conditional rendering)
  useEffect(() => {
    // Отримуємо user_id з Telegram WebApp SDK
    const tg = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
    const tgUser = tg?.initDataUnsafe?.user;
    const userId = tgUser?.id;

    if (!userId) return;

    let cancelled = false;
    fetch(`/api/user/profile?user_id=${userId}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (!cancelled && data?.ok && data.user) {
          setUserProfile(data.user);
        }
      })
      .catch(() => {}); // мовчки ігноруємо помилки

    return () => { cancelled = true; };
  }, []);

  // Контекст для блоків
  const context: BlockContext = useMemo(
    () => ({
      codeword: scenario?.codeword ?? codeword ?? "",
      title: scenario?.title ?? null,
      photoUrl: scenario?.photo_url ?? null,
      user: userProfile ?? undefined,
    }),
    [scenario, requestedCodeword, userProfile],
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
    if (baseCodeword) {
      return <PageRenderer config={FALLBACK_PAGE_CONFIG} context={context} className="page-layout" />;
    }

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
      <PageRenderer
        config={FALLBACK_PAGE_CONFIG}
        context={context}
        className="page-layout"
      />
    );
  }

  if (!scenario?.pageData) {
    if (baseCodeword) {
      return <PageRenderer config={FALLBACK_PAGE_CONFIG} context={context} className="page-layout" />;
    }

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
