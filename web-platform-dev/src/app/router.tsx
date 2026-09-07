/**
 * Router — всі URL рендеряться через сценарії (SD-1..SD-2).
 *
 * Структура:
 *   /          → сценарій __base__ (платформа)
 *   /:path/*   → сценарій за web_slug / codeword
 *
 * Немає глобальних хедерів, сайдбарів, футерів — усе приходить із
 * зон page_data (sidebar/header/main/footer). Фолбек — тільки при
 * падінні доступу до бази сценаріїв.
 */

import { createBrowserRouter } from "react-router-dom";
import { ScenarioPage } from "@/pages/ScenarioPage";

export const router = createBrowserRouter([
  { path: "*", element: <ScenarioPage /> },
]);
