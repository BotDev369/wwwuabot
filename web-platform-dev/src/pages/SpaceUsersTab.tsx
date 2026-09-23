/**
 * «Користувачі» — люди, які самі відкрили свій профіль.
 *
 * **Порожнеча має причину.** «Нікого немає» без пояснення читалось би як
 * поламана стрічка, тож текст каже, **чому** тут порожньо: профіль з'являється
 * тоді, коли людина сама його відкриє. Це не наше заповнення — це ознака
 * порожнього Простору.
 *
 * **Керування стоїть другим рядком** (`SpaceListToolbar`), як у кожному розділі
 * Простору: перший рядок — знак панелі й назва розділу, другий — те, чим список
 * керують, далі — сам список. Тут це пошук: людей шукають за іменем або описом.
 *
 * **Картка бере адресу з однієї функції** (`spaceUserPath`): шлях людини
 * складається в одному місці, а не клеїться тут.
 */

import { useState, type ReactElement } from "react";
import { Icon, PublicUserCard, type PublicProfile } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { spaceUserPath } from "@/app/routes";
import { SpaceListEmpty } from "./SpaceListEmpty";
import { SpaceListToolbar } from "./SpaceListToolbar";
import {
  DEFAULT_SPACE_LIST_VIEW,
  SPACE_LIST_CLASS,
  filterByQuery,
  type SpaceListView,
} from "./space-list-view";

export function SpaceUsersTab({
  items,
  loading,
  error,
  onRetry,
}: {
  items: PublicProfile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}): ReactElement {
  const navigate = useNavigate();
  const [view, setView] = useState<SpaceListView>(DEFAULT_SPACE_LIST_VIEW);

  // Шукаємо за тим, що видно в рядку: інакше знайдене неможливо впізнати.
  const visible = filterByQuery(items, view.query, (profile) => [
    profile.platformUsername,
    profile.about,
    profile.role,
    profile.status,
  ]);
  const change = (patch: Partial<SpaceListView>): void =>
    setView((prev) => ({ ...prev, ...patch }));

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 180, height: 20 }} />
        <p className="wb-text-muted">Завантаження…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="warning" size={32} />
        </span>
        <p className="wb-text-red">{error}</p>
        <button className="wb-btn wb-btn-secondary" onClick={onRetry}>
          Спробувати ще
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="users" size={32} />
        </span>
        <p className="wb-empty-text">
          Тут поки нікого немає. Профіль з'являється, коли людина сама відкриє його в себе в
          акаунті.
        </p>
      </div>
    );
  }

  return (
    <>
      <SpaceListToolbar
        view={view}
        onChange={change}
        searchLabel="Пошук за іменем або описом"
        shown={visible.length}
        total={items.length}
      />

      {visible.length === 0 ? (
        <SpaceListEmpty onReset={() => change(DEFAULT_SPACE_LIST_VIEW)} />
      ) : (
        <div className={SPACE_LIST_CLASS}>
          {visible.map((profile) => (
            <PublicUserCard
              key={profile.id}
              profile={profile}
              onSelect={() => navigate(spaceUserPath(profile.id))}
            />
          ))}
        </div>
      )}
    </>
  );
}
