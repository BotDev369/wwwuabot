/**
 * Сторінки людини в платформі — свої й відкриті.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/pages`): тут лишаються
 * тільки **шляхи**, і саме тому вони тут, а не в компоненті. Своє читається
 * з-під підписаного `initData`, а Простір — публічний; переплутати їх означало б
 * показати приватні сторінки всім.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createPagesApi } from "@wwwuabot/shared/pages";
import { apiFetch } from "./client";

export const pagesApi = createPagesApi(apiFetch, {
  own: "/api/user/pages",
  space: "/api/space/pages",
});
