/**
 * «Сторінки» — список **своїх** сторінок людини.
 *
 * Тут видно обидва стани, які ця фіча має: приватна сторінка (її видно лише
 * авторові) і публічна (вона ж стоїть у Просторі). Рядок відкриває перегляд
 * (`/pages/:id`) — там і перемикач, і видалення: у списку з одним дотиком на
 * рядок друга дія змушувала б угадувати, котра з двох спрацювала.
 *
 * **Створення тут — адреса, а не поверхня.** «+» веде на `/pages/new`, де
 * спершу видно шаблон, а потім на ньому правлять текст. Це той самий вибір, що
 * в решти розділів давно зроблений на користь сторінки: у модалки немає ні
 * історії, ні «назад», ні посилання (`AGENTS.md` §7).
 *
 * **`?new=1` лишається робочим і веде туди ж.** Намір створити — частина
 * адреси (`withCreateIntent`), і за посиланням `…/pages?new=1` зі старої версії
 * мусить відкриватись створення, а не список, який мовчки нічого не робить.
 * Тому намір **переадресовує** (`replace`), а не відкриває форму вдруге.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCreateForm } from "@/app/useCreateForm";
import { Icon } from "@wwwuabot/shared";
import { PAGES_NEW_PATH, userPagePath } from "@/app/routes";
import { pageHint, pageTemplateIcon } from "./pages-view";
import { useUserPages } from "./useUserPages";

export function UserPagesPage(): ReactElement {
  const navigate = useNavigate();
  const { pages, loading, error } = useUserPages();
  const form = useCreateForm();

  // Намір, що прийшов адресою: створення тепер має власний екран.
  if (form.open) return <Navigate to={PAGES_NEW_PATH} replace />;

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Сторінки</h1>
        <div className="wb-page-actions">
          {/* Створення є й у хабі («+» у футері), але на екрані сторінок кнопка
              мусить бути тут: людина вже стоїть у списку, і вертати її в хаб —
              зайвий крок. */}
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-page-add"
            onClick={() => void navigate(PAGES_NEW_PATH)}
            aria-label="Створити сторінку"
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження сторінок…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && pages.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="page" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодної сторінки.</p>
          {/* Кажемо, як створити, і що саме від людини вимагається — текст:
              без цього порожній екран лишається глухим кутом. */}
          <p className="wb-empty-text">
            Натисніть «+» угорі, подивіться два шаблони — «Візитка» чи «Подія» — оберіть той, що
            підходить, і впишіть свій текст.
          </p>
        </div>
      )}

      {!loading && !error && pages.length > 0 && (
        <div className="wb-menu-list">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className="wb-menu-item"
              onClick={() => void navigate(userPagePath(page.id))}
            >
              <span className="wb-menu-item-icon">
                <Icon name={pageTemplateIcon(page.template)} size={20} />
              </span>
              <span className="wb-menu-item-text">
                <span className="wb-menu-item-label">{page.title}</span>
                <span className="wb-menu-item-hint">{pageHint(page)}</span>
              </span>
              <span className="wb-menu-item-icon">
                <Icon name="chevron-right" size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
