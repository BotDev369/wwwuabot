/**
 * Правка своєї сторінки — **окремий крок, а не стан перегляду**.
 *
 * `/pages/7/edit` — це адреса: із неї видно, що людина не дивиться сторінку, а
 * править її, «назад» вертає на перегляд, а посилання на правку можна надіслати
 * (у перегляді перемикач і видалення — сусідні дії, і змішувати їх із
 * редагуванням тексту означало б знову ґуґлити, яка кнопка що робить).
 *
 * **Рядок той самий, що на перегляді** (`useUserPage`): правка відкривається
 * тим, що вже є, а не порожньою формою — інакше збереження затерло б написане.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { pageDraft } from "@wwwuabot/shared/pages";
import { userPagePath } from "@/app/routes";
import { PageEditor } from "./PageEditor";
import { PageState } from "./PageState";
import { useUserPage } from "./useUserPage";

export function PageEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { page, loading, error, pages } = useUserPage(id);

  if (!page) {
    return (
      <div className="wb-page">
        <PageState loading={loading} message={error ?? "Такої сторінки немає."} />
      </div>
    );
  }

  return (
    <PageEditor
      mode="edit"
      initial={pageDraft(page)}
      onBack={() => void navigate(userPagePath(page.id))}
      onSaved={(saved) => {
        // Збережене віддаємо спискові — перегляд бере сторінку з нього, і без
        // цього він показав би текст, який людина щойно змінила.
        pages.upsert(saved);
        void navigate(userPagePath(saved.id), { replace: true });
      }}
    />
  );
}
