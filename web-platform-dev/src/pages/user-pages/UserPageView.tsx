/**
 * Своя сторінка — перегляд, перемикач і редактор в одному місці.
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
 * **Стан показується після відповіді сервера.** Увімкнений перемикач, який не
 * зберігся, — найгірше з можливого: людина вважала б сторінку відкритою, а
 * вона закрита (`docs/SPACE.md`).
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import { buildPageConfig, pageDraft, pageTemplate, type UserPage } from "@wwwuabot/shared/pages";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { useDialog } from "@wwwuabot/ui/dialog";
import { PAGES_PATH } from "@/app/routes";
import { pagesApi } from "@/shared/api/pages.api";
import { PageCreateSheet } from "../create/PageCreateSheet";
import { pageAddressLabel, visibilityLabel } from "./pages-view";
import { useUserPages } from "./useUserPages";

registerAllBlocks();

export function UserPageView(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { pages, loading, error, upsert, remove } = useUserPages();
  const [editing, setEditing] = useState(false);

  // Сміття в адресі (`/pages/abc`) — це не «нуль», а відсутність сторінки:
  // запит із таким номером пішов би в нікуди й повернув чужу помилку.
  const parsed = Number(id);
  const pageId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const page = pageId === null ? null : (pages.find((item) => item.id === pageId) ?? null);

  async function togglePublic(next: boolean): Promise<void> {
    if (!page) return;
    try {
      const saved = await pagesApi.save({ ...pageDraft(page), isPublic: next });
      if (saved) upsert(saved);
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
      remove(target.id);
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

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження…</p>
        </div>
      )}

      {!loading && (error || !page) && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="lock" size={32} />
          </span>
          <p className="wb-empty-text">{error ?? "Такої сторінки немає."}</p>
        </div>
      )}

      {page && (
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
                  onClick={() => setEditing(true)}
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

      {editing && page && (
        <PageCreateSheet
          initial={pageDraft(page)}
          onSaved={upsert}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
