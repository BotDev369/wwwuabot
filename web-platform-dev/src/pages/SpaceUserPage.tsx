/**
 * Людина в Просторі — сторінка за карткою зі стрічки.
 *
 * **Адреса, а не поверхня.** За карткою стоїть людина, і на неї дивляться
 * довше, ніж на рядок стрічки: з неї має бути видно, куди прийшов, «назад»
 * мусить вертати у Простір, а посилання — надсилатись. Слот, який відкриває
 * модалку, цього не вміє.
 *
 * **Картка та сама, що в стрічці** (`--full`): людина бачила її там, і впізнає
 * тут. Розбіжність у розмітці дала б два подання одного профілю — те саме, від
 * чого ми вже відмовились у картках акаунта.
 *
 * @module web-platform-dev/src/pages/SpaceUserPage
 */

import type { ReactElement } from "react";
import { Icon, PublicUserCard } from "@wwwuabot/shared";
import { useNavigate, useParams } from "react-router-dom";
import { SPACE_PATH } from "@/app/routes";
import { useSpaceUser } from "./useSpaceUser";

export function SpaceUserPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Сміття в адресі (`/space/u/abc`) — це не «нуль», а відсутність людини:
  // запит із таким номером пішов би в нікуди й повернув чужу помилку.
  const parsed = Number(id);
  const userId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const { profile, loading, error } = useSpaceUser(userId);

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => navigate(SPACE_PATH)}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          Профіль
        </h1>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="lock" size={32} />
          </span>
          <p className="wb-empty-text">{error}</p>
        </div>
      )}

      {profile && <PublicUserCard profile={profile} full />}
    </div>
  );
}
