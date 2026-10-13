/**
 * «Оголошення» — дошка, яку наповнюють люди.
 *
 * **Це екран, а не вкладка.** Дошку відкривають зі «Сервісів» (або власною
 * адресою `/ads`), і їй не потрібна чужа навігація поруч: список, смуга
 * керування й «+» — усе, що тут є.
 *
 * **Композер відкривається адресою.** Створення — це **запис історії**
 * (`?new=1`, `useCreateForm`), тож «назад» закриває форму й лишає людину в
 * дошці, а не виводить зі сторінки. Правка свого оголошення — локальний стан,
 * бо вона завжди про конкретний рядок, і рядок уже є в дошці.
 *
 * @module web-platform-dev/src/pages/AdsPage
 */

import { useState, type ReactElement } from "react";
import type { Ad, AdDraft } from "@wwwuabot/shared/ads";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useCreateForm } from "@/app/useCreateForm";
import { AdCreateSheet } from "./create/AdCreateSheet";
import { adDraftFrom } from "./ads-list";
import { AdsBoard } from "./AdsBoard";
import { useAds } from "./useAds";

/** Що саме показує композер: `draft` немає — створюємо нове. */
interface ComposerRequest {
  draft?: AdDraft;
}

export function AdsPage(): ReactElement {
  useScreenChrome({ title: "Оголошення" });
  // Створення — в адресі (`useCreateForm`), правка свого оголошення — тут: вона
  // завжди про конкретний рядок, і рядок уже є в дошці.
  const form = useCreateForm();
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const composerOpen = form.open || composer !== null;
  const ads = useAds();

  /** Відкрити композер: без оголошення — нове (за адресою), з ним — правка. */
  function compose(draft?: Ad): void {
    if (draft === undefined) {
      setComposer(null);
      form.openForm();
      return;
    }
    setComposer({ draft: adDraftFrom(draft) });
  }

  /** Закрити композер: правку скидаємо, форму вертаємо в адресі. */
  function closeComposer(): void {
    setComposer(null);
    form.closeForm();
  }

  return (
    <div className="wb-page">
      <AdsBoard
        items={ads.items}
        loading={ads.loading}
        error={ads.error}
        onRetry={() => ads.reload(true)}
        onCompose={compose}
        onToggle={(ad) => ads.save(adDraftFrom(ad, { isActive: !ad.isActive }))}
        onRemove={ads.remove}
      />

      {composerOpen && (
        <AdCreateSheet
          initial={composer?.draft}
          // Дошка перечитується після запису: у ній видно і своє, і чуже, а
          // показати це може лише свіжий список.
          onSaved={() => ads.reload()}
          onClose={closeComposer}
        />
      )}
    </div>
  );
}
