/**
 * Оголошення в платформі — свої й дошка.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/ads`): тут лишаються
 * тільки **шляхи**, і саме тому вони тут, а не в компоненті: своє читається
 * з-під підписаного `initData`, а дошка — публічна, і переплутати їх означало б
 * показати чужі чернетки.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createAdsApi } from "@wwwuabot/shared/ads";
import { apiFetch } from "./client";

export const adsApi = createAdsApi(apiFetch, {
  own: "/api/user/ads",
  board: "/api/space/ads",
});
