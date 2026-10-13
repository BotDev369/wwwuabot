/**
 * «Користувачі» — люди, які самі відкрили свій профіль.
 *
 * **Порожнеча має причину.** «Нікого немає» без пояснення читалось би як
 * поламана стрічка, тож текст каже, **чому** тут порожньо: профіль з'являється
 * тоді, коли людина сама його відкриє. Це не наше заповнення — це ознака
 * порожньої стрічки.
 *
 * **Керування стоїть другим рядком** (`ListToolbar`), як у кожному списку
 * продукту: перший рядок — назва екрана, другий — те, чим список керують, далі —
 * сам список. Тут це пошук: людей шукають за іменем або описом.
 *
 * **Картка не веде далі.** За людиною стоїть сама людина — окремої адреси під
 * неї немає, тож картка лишається в стрічці й не обіцяє переходу.
 */

import { useState, type ReactElement } from "react";
import { Icon, PublicUserCard, type PublicProfile } from "@wwwuabot/shared";
import { ListEmpty } from "./ListEmpty";
import { ListToolbar } from "./ListToolbar";
import { DEFAULT_LIST_VIEW, LIST_CLASS, filterByQuery, type ListView } from "./list-view";

export function UsersList({
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
  const [view, setView] = useState<ListView>(DEFAULT_LIST_VIEW);

  // Шукаємо за тим, що видно в рядку: інакше знайдене неможливо впізнати.
  const visible = filterByQuery(items, view.query, (profile) => [
    profile.platformUsername,
    profile.about,
    profile.role,
    profile.status,
  ]);
  const change = (patch: Partial<ListView>): void => setView((prev) => ({ ...prev, ...patch }));

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
      <ListToolbar
        view={view}
        onChange={change}
        searchLabel="Пошук за іменем або описом"
        shown={visible.length}
        total={items.length}
      />

      {visible.length === 0 ? (
        <ListEmpty onReset={() => change(DEFAULT_LIST_VIEW)} />
      ) : (
        <div className={LIST_CLASS}>
          {visible.map((profile) => (
            <PublicUserCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </>
  );
}
