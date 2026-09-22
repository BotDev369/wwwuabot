/**
 * Своя сторінка за номером з адреси — **одна** для перегляду й редактора.
 *
 * Номер у шляху (`/pages/7`, `/pages/7/edit`) — це адреса рядка, а не його
 * вміст, тож читає його той, хто знає маршрут: екран. Розбір тут, а не в
 * кожному екрані окремо: сміття в адресі (`/pages/abc`) — це не «нуль», а
 * **відсутність** сторінки, і запит із таким номером пішов би в нікуди й
 * повернув чужу помилку.
 *
 * Дані бере той самий список (`useUserPages`) — екран шукає в ньому свою
 * сторінку. Другий запит «дай одну» віддавав би той самий рядок із тим самим
 * фільтром, а розійтися вони могли б лише в одному — у видимості, тобто саме
 * там, де помилка найдорожча.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { UserPage } from "@wwwuabot/shared/pages";
import { parseUserPageId } from "./pages-view";
import { useUserPages, type UserPagesState } from "./useUserPages";

export interface UserPageState {
  /** Сторінка з адреси; `null` — її ще немає (шукають або такої немає взагалі). */
  page: UserPage | null;
  loading: boolean;
  error: string | null;
  /** Список цілком — він же джерело правди для інших рядків того самого екрана. */
  pages: UserPagesState;
}

export function useUserPage(id: string | undefined): UserPageState {
  const pages = useUserPages();
  const pageId = parseUserPageId(id);
  const page = pageId === null ? null : (pages.pages.find((item) => item.id === pageId) ?? null);

  return { page, loading: pages.loading, error: pages.error, pages };
}
