/**
 * Своя сторінка — перегляд, перемикач і дії в одному місці.
 *
 * **Адреса, а не поверхня.** За рядком списку стоїть сторінка: на неї дивляться
 * довше, з неї мусить бути видно, куди прийшов, «назад» — вертати в список, а
 * посилання — надсилатись. Слот, який відкриває модалку, цього не вміє.
 *
 * **Сторінка тут — та сама, що назовні.** Її рендерить `PageRenderer` з тієї ж
 * `page_data`, яку будує `buildPageConfig`: приватна відрізняється від
 * публічної **одним прапорцем**, а не іншим поданням. Так автор бачить те, що
 * побачить інший, і не мусить уявляти це з форми.
 *
 * **Правка тексту — сусідня адреса, а не стан цього екрана** (`/pages/:id/edit`):
 * правити текст можна довго, і «назад» із правки вертає саме на перегляд, а не
 * в список; тут же лишаються дії над сторінкою цілком — показати назовні,
 * увімкнути публічність, видалити.
 *
 * **Стан показується після відповіді сервера.** Увімкнений перемикач, який не
 * зберігся, — найгірше з можливого: людина вважала б сторінку відкритою, а
 * вона закрита (`docs/SPACE.md`).
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import { buildPageConfig, pageDraft, pageTemplate, type UserPage } from "@wwwuabot/shared/pages";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { useDialog } from "@wwwuabot/ui/dialog";
import { PAGES_PATH, userPageEditPath } from "@/app/routes";
import { pagesApi } from "@/shared/api/pages.api";
import { PageState } from "./PageState";
import { pageAddressLabel, visibilityLabel } from "./pages-view";
import { useUserPage } from "./useUserPage";

registerAllBlocks();

export function UserPageView(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { page, loading, error, pages } = useUserPage(id);

  async function togglePublic(next: boolean): Promise<void> {
    if (!page) return;
    try {
      const saved = await pagesApi.save({ ...pageDraft(page), isPublic: next });
      if (saved) pages.upsert(saved);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося змінити видимість", {
        title: "Помилка",
      });
    }
  }

  async function deletePage(target: UserPage): Promise<void> {
    const confirmed = await dialog.confirm(`Видалити сторінку «${target.title}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!confirmed) return;

    try {
      await pagesApi.remove(target.id);
      pages.remove(target.id);
      await navigate(PAGES_PATH, { replace: true });
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося видалити сторінку", {
        title: "Помилка",
      });
    }
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(PAGES_PATH)}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          {page?.title ?? "Сторінка"}
        </h1>
      </div>

      {!page ? (
        <PageState loading={loading} message={error ?? "Такої сторінки немає."} />
      ) : (
        <>
          <div className="wb-card">
            <div className="wb-card-body">
              <SwitchRow
                label="Публічна сторінка"
                hint={page.isPublic ? "Видно всім у Просторі" : "Видно лише вам"}
                checked={page.isPublic}
                onToggle={(next) => void togglePublic(next)}
              />

              {/* Адреса — це те, чим сторінку показують іншим, тож вона стоїть
                  тут, а не «десь у редакторі». Приватна теж має адресу: вона
                  вже зайнята і чекає на перемикач. */}
              <p className="wb-text-muted">
                {visibilityLabel(page.isPublic)} · {pageAddressLabel(page)}
              </p>

              <div className="wb-sheet-actions">
                {page.isPublic && (
                  <button
                    type="button"
                    className="wb-btn wb-btn-secondary"
                    onClick={() => void navigate(toWebPath(page.slug))}
                  >
                    <Icon name="external-link" size={16} />
                    Відкрити
                  </button>
                )}
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={() => void navigate(userPageEditPath(page.id))}
                >
                  <Icon name="edit" size={16} />
                  Змінити текст
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn-ghost"
                  onClick={() => void deletePage(page)}
                >
                  <Icon name="trash" size={16} />
                  Видалити
                </button>
              </div>
            </div>
          </div>

          <PageRenderer
            config={buildPageConfig(pageTemplate(page.template), page.values)}
            context={{ slug: page.slug, title: page.title, photoUrl: null }}
            className="page-layout"
          />
        </>
      )}
    </div>
  );
}
