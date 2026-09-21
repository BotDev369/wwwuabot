/**
 * «Оголошення» — дошка Простору.
 *
 * **Смуга керування, а не кнопка на пів екрана.** Створення й пошук живуть в
 * одному ряду (`SpaceAdsToolbar` + спільна смуга колекції): так дошка виглядає
 * як усі інші списки продукту, а список читають, а не прогортають повз кнопку.
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

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Ad } from "@wwwuabot/shared/ads";
import { collectionViewClass } from "@wwwuabot/ui/collection";
import { useDialog } from "@wwwuabot/ui/dialog";
import { AdCard } from "./AdCard";
import { SpaceAdsToolbar } from "./SpaceAdsToolbar";
import { DEFAULT_ADS_VIEW, filterAds, type AdsView } from "./ads-view";
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
  // Пошук і фільтри — стан екрана, як у нотаток: список лише малює вибране.
  const [view, setView] = useState<AdsView>(DEFAULT_ADS_VIEW);

  const visible = filterAds(items, view);
  const hasItems = !loading && !error && items.length > 0;

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
      {hasItems && (
        <SpaceAdsToolbar
          items={items}
          view={view}
          onChange={(patch) => setView((prev) => ({ ...prev, ...patch }))}
          shown={visible.length}
          onCompose={() => onCompose()}
        />
      )}

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

      {/* Порожня дошка каже, **де** створити оголошення: смуга керування тут не
          малюється (нема чого шукати й фільтрувати), а «+» лишається у футері. */}
      {!loading && !error && items.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="feed" size={32} />
          </span>
          <p className="wb-empty-text">Тут поки нічого немає.</p>
          <p className="wb-empty-text">
            Натисніть «+» у нижньому футері — оголошення з'явиться на дошці.
          </p>
        </div>
      )}

      {hasItems && visible.length > 0 && (
        <div className={collectionViewClass(view)}>
          {visible.map(({ ad, mine }) => (
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

      {/* Фільтр звузив усе — і це видно словами: «порожньо» без причини читалось
          би як поламана дошка. */}
      {hasItems && visible.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="search" size={32} />
          </span>
          <p className="wb-empty-text">Нічого не знайдено за цим запитом.</p>
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => setView(DEFAULT_ADS_VIEW)}
          >
            <Icon name="close" size={16} />
            Скинути пошук і фільтри
          </button>
        </div>
      )}
    </>
  );
}
