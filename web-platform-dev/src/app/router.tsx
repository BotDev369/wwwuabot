/**
 * Router — всі URL рендеряться через сценарії (SD-1..SD-2).
 *
 * Структура:
 *   /              → сценарій __base__ (платформа)
 *   /sites         → мої сайти
 *   /sites/:slug   → редактор сайту
 *   /catalog       → публічний каталог
 *   /view/:slug    → публічний перегляд сайту
 *   /:path/*       → сценарій за web_slug / codeword
 */

import { createBrowserRouter } from "react-router-dom";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { MySitesPage } from "@/pages/MySitesPage";
import { SiteNewPage } from "@/pages/SiteNewPage";
import { SiteEditorPage } from "@/pages/SiteEditorPage";
import { PublicCatalogPage } from "@/pages/PublicCatalogPage";
import { SiteViewPage } from "@/pages/SiteViewPage";

export const router = createBrowserRouter([
  // Sites
  { path: "/sites", element: <MySitesPage /> },
  { path: "/sites/new", element: <SiteNewPage /> },
  { path: "/sites/:slug", element: <SiteEditorPage /> },

  // Catalog
  { path: "/catalog", element: <PublicCatalogPage /> },
  { path: "/view/:slug", element: <SiteViewPage /> },

  // Catch-all: сценарії
  { path: "*", element: <ScenarioPage /> },
]);
