/**
 * Router — маршрути будуються з реєстру екранів.
 *
 * `SCREEN_ROUTES` — це `key → компонент` (код), злитий із адресою з
 * `registry.json` (дані). Тому новий екран не потребує правки цього файлу:
 * рядок у реєстрі + компонент у карті, і маршрут з'явився.
 *
 * **Виняток — рівно два маршрути.** `/` — вітрина входу, у неї немає `slug` і
 * вона не є екраном усередині продукту; `*` — catch-all сторінки контенту за її
 * `slug`. Обидва стоять тут, бо реєстр описує **екрани платформи**, а не
 * сторінки людей і не обкладинку.
 *
 * @module web-platform-dev/src/app/router
 */

import { createBrowserRouter } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { ENTRY_ELEMENT, SCREEN_ROUTES } from "./screen-routes";

export const router = createBrowserRouter([
  {
    element: <PlatformShell />,
    children: [
      { index: true, element: ENTRY_ELEMENT },
      ...SCREEN_ROUTES.map((route) => ({ path: route.path, element: route.element })),
      // Catch-all: сторінка за її адресою (`/galyashop`, `/viruvannia/...`).
      { path: "*", element: <ScenarioPage /> },
    ],
  },
]);
