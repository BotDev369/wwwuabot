/**
 * Схеми теми в платформі — свої й спільні.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/themes`): тут
 * лишаються тільки **шляхи**, і саме тому вони тут, а не в компоненті: своє
 * читається з-під підписаного `initData`, спільна бібліотека — публічна, і
 * переплутати їх означало б показати чужі закриті схеми.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createThemesApi } from "@wwwuabot/shared/themes";
import { apiFetch } from "./client";

export const themesApi = createThemesApi(apiFetch, {
  mine: "/api/user/themes",
  shared: "/api/space/themes",
});
