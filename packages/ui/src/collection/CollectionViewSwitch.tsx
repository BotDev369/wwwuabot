/**
 * `CollectionViewSwitch` — клітинка «відображення»: рядки чи картки, і скільки
 * колонок.
 *
 * Це **спільний кирпичик**, тому тут немає нічого про нотатки: знак, пікер і
 * поточний вибір. Нотатки — його перший користувач, товари, новини й пости —
 * наступні, і вони отримають ту саму клітинку, а не свою копію.
 *
 * Поверхня — та сама, що в решти виборів екрана (`MenuModal`, правило 4):
 * варіанти не випадають списком, а відкривають повноекранний список із
 * галочкою на вибраному. Тому клітинка **не показує** поточний вибір собою —
 * його видно чипом поруч, а ім'я й стан читає `aria-label`; знак у клітинці
 * один і той самий, бо «як розставлено» — це одна дія, а не чотири.
 *
 * @module @wwwuabot/ui/collection
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "../menu";
import {
  COLLECTION_OPTIONS,
  collectionViewLabel,
  sameCollectionView,
  type CollectionView,
} from "./types";

interface CollectionViewSwitchProps {
  /** Поточний вигляд. */
  view: CollectionView;
  /** Вибір варіанта: екран сам вирішує, куди його покласти. */
  onChange: (view: CollectionView) => void;
}

export function CollectionViewSwitch({ view, onChange }: CollectionViewSwitchProps): ReactElement {
  const [open, setOpen] = useState(false);
  const label = collectionViewLabel(view);

  const items: MenuItem[] = COLLECTION_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    icon: option.icon,
    selected: sameCollectionView(view, option.view),
    // Вибір закриває поверхню: людина вже побачила, що список змінився, і
    // друга дія («закрити») тут була б роботою на порожньому місці.
    onSelect: () => {
      onChange(option.view);
      setOpen(false);
    },
  }));

  return (
    <>
      <button
        type="button"
        className="wb-collection-tool"
        aria-label={`Відображення: ${label}`}
        title={`Відображення: ${label}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="layout" size={16} />
      </button>

      {open && <MenuModal title="Відображення" items={items} onClose={() => setOpen(false)} />}
    </>
  );
}
