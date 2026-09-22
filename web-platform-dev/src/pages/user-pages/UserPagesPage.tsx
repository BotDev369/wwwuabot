/**
 * «Сторінки» — список **своїх** сторінок людини.
 *
 * Тут видно обидва стани, які ця фіча має: приватна сторінка (∏її видно лише
 * авторові) і публічна (вона ж стоїть у Просторі). Рядок відкриває перегляд
 * (`/pages/:id`) — там і перемикач, і редактор, і видалення: у списку з одним
 * дотиком на рядок друга дія змушувала б угадувати, котра з двох спрацювала.
 *
 * **Форма — композер, і він один на два входи.** Тут його відкриває «+» екрана,
 * у хабі «Створити» — «+» у пункті «Сторінки», де він з'являється **поверхнею
 * на самому хабі** й нікуди не веде. Другого вікна створення немає
 * (`AGENTS.md` §7), а відкриття й закриття тут тримає `useCreateForm`: форма —
 * **запис історії** (`?new=1`), тож «назад» її закриває, а людина лишається в
 * списку. Правка існуючої сторінки адреси не має: вона завжди про конкретний
 * рядок, і рядок уже в списку.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useCreateForm } from "@/app/useCreateForm";
import { userPagePath } from "@/app/routes";
import { PageCreateSheet } from "../create/PageCreateSheet";
import { pageHint, pageTemplateIcon } from "./pages-view";
import { useUserPages } from "./useUserPages";

export function UserPagesPage(): ReactElement {
  const navigate = useNavigate();
  const { pages, loading, error, upsert } = useUserPages();
  // Створення — в адресі (`useCreateForm`): форма тут лише одна, і вона про
  // нову сторінку. Правка живе в перегляді — вона завжди про конкретний рядок,
  // а в рядка списку одна дія (відкрити).
  const form = useCreateForm();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Сторінки</h1>
        <div className="wb-page-actions">
          {/* Створення є й у хабі («+» у футері), але на екрані сторінок кнопка
              мусить бути тут: людина вже стоїть у списку, і вертати її в хаб —
              зайвий крок. Обробник той самий — композер. */}
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-page-add"
            onClick={form.openForm}
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
            <Icon name="layout" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодної сторінки.</p>
          {/* Кажемо, як створити, і що саме від людини вимагається — текст:
              без цього порожній екран лишається глухим кутом. */}
          <p className="wb-empty-text">
            Натисніть «+» угорі, виберіть шаблон — «Візитка» чи «Подія» — і заповніть текст.
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

      {form.open && (
        <PageCreateSheet
          // Збережений рядок віддаємо спискові: він джерело правди, тож
          // повторний запит був би зайвим.
          onSaved={upsert}
          onClose={form.closeForm}
        />
      )}
    </div>
  );
}
