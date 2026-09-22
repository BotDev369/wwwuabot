/**
 * Свої сторінки — дані для списку, перегляду й редактора.
 *
 * Джерело — `GET /api/user/pages`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужі
 * сторінки. Приватні серед них є — і мусять бути: це власний список людини, а
 * не стрічка.
 *
 * **Один хук на два екрани.** Список (`/pages`) і перегляд (`/pages/:id`)
 * читають те саме джерело: екран перегляду шукає свою сторінку в цьому ж
 * списку. Другий запит «дай одну» віддавав би той самий рядок із тим самим
 * фільтром, а розійтися вони могли б лише в одному — у видимості, тобто саме
 * там, де помилка найдорожча.
 *
 * **Оновлення — локальні, а не повторним запитом.** Сервер уже повертає
 * збережений рядок, тож другий похід по весь список був би зайвим і показав би
 * «завантаження» там, де нічого не завантажується.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { useCallback, useEffect, useState } from "react";
import type { UserPage } from "@wwwuabot/shared/pages";
import { pagesApi } from "@/shared/api/pages.api";

export interface UserPagesState {
  pages: UserPage[];
  loading: boolean;
  error: string | null;
  /** Додати або замінити сторінку: збережений рядок — джерело правди. */
  upsert: (page: UserPage) => void;
  /** Прибрати сторінку зі списку після видалення. */
  remove: (id: number) => void;
}

export function useUserPages(): UserPagesState {
  const [pages, setPages] = useState<UserPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    pagesApi
      .listOwn()
      .then((list) => {
        if (cancelled) return;
        setPages(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити сторінки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const upsert = useCallback((page: UserPage) => {
    setPages((prev) =>
      prev.some((item) => item.id === page.id)
        ? prev.map((item) => (item.id === page.id ? page : item))
        : [page, ...prev],
    );
  }, []);

  const remove = useCallback((id: number) => {
    setPages((prev) => prev.filter((page) => page.id !== id));
  }, []);

  return { pages, loading, error, upsert, remove };
}
