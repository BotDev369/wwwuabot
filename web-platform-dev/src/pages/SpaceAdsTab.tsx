/**
 * «Оголошення» — дошка Простору.
 *
 * **Свої дії тільки на своєму.** Кнопки стоять під оголошеннями власника, і це
 * не оформлення: редагувати чуже все одно не вийде — сервер відповість 404, бо
 * власник стоїть у `WHERE`. Показувати кнопку, яка гарантовано не працює, було
 * б обіцянкою, а не дією (AGENTS.md §7).
 *
 * **Видалення питає.** Оголошення — це написане людиною, і зникає воно
 * назавжди; діалог тут не формальність, а єдиний спосіб відрізнити дотик від
 * рішення. «Прибрати з дошки» не питає: воно оборотне — те саме оголошення
 * показують назад тим самим дотиком.
 *
 * @module web-platform-dev/src/pages/SpaceAdsTab
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Ad } from "@wwwuabot/shared/ads";
import { useDialog } from "@wwwuabot/ui/dialog";
import { AdCard } from "./AdCard";
import type { SpaceAd } from "./ads-list";

export function SpaceAdsTab({
  items,
  loading,
  error,
  onRetry,
  onCompose,
  onToggle,
  onRemove,
}: {
  items: SpaceAd[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /**
   * Відкрити композер: без оголошення — створити нове, з ним — змінити своє.
   *
   * Передаємо **рядок із бази**, а не готову чернетку: перетворення
   * «оголошення → форма» теж чисте правило, і місце йому поряд зі списком
   * (`adDraftFrom`), а не в розмітці.
   */
  onCompose: (ad?: Ad) => void;
  onToggle: (ad: Ad) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}): ReactElement {
  const dialog = useDialog();

  async function confirmDelete(ad: Ad): Promise<void> {
    const question = ad.title || ad.body.slice(0, 60);
    const confirmed = await dialog.confirm(`Видалити оголошення «${question}»?`, {
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!confirmed) return;

    try {
      await onRemove(ad.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося видалити", {
        tone: "danger",
      });
    }
  }

  return (
    <>
      <button className="wb-btn wb-btn-primary wb-space-create" onClick={() => onCompose()}>
        <Icon name="plus" size={16} />
        Створити оголошення
      </button>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 180, height: 20 }} />
          <p className="wb-text-muted">Завантаження…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => onRetry()}>
            Спробувати ще
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="feed" size={32} />
          </span>
          <p className="wb-empty-text">
            Тут поки нічого немає. Оголошення з'являються одразу після того, як їх напишуть.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="wb-ads">
          {items.map(({ ad, mine }) => (
            <AdCard
              key={ad.id}
              ad={ad}
              mine={mine}
              onEdit={() => onCompose(ad)}
              onToggle={() => void onToggle(ad)}
              onDelete={() => void confirmDelete(ad)}
            />
          ))}
        </div>
      )}
    </>
  );
}
