import {
  PUBLIC_FIELD_LABELS,
  PUBLIC_PROFILE_FIELDS,
  type PublicProfileField,
} from "../../user/public-profile";
import { SwitchRow } from "../Switch";

/** Новий стан перемикачів: чи публічний профіль і що саме відкрито. */
export interface PublicProfileChange {
  isPublic: boolean;
  fields: PublicProfileField[];
}

/**
 * Публічність профілю: **один** перемикач зверху й поля під ним — лише коли
 * профіль уже відкрито.
 *
 * **Поля не показуються, поки профіль закритий.** Інакше людина бачила б шість
 * перемикачів, які зараз ні на що не впливають, і мусила б здогадуватись, що
 * спершу треба ввімкнути перший.
 *
 * **Порядок полів — із самого списку** (`PUBLIC_PROFILE_FIELDS`), а не з того,
 * у якому їх зберіг клієнт: перемикачі мусять стояти на одному місці щоразу,
 * інакше їх шукають заново.
 *
 * Компонент нічого не зберігає: що робити з новим станом, вирішує екран, який
 * знає про API.
 */
export function PublicProfileControls({
  isPublic,
  openFields,
  disabled = false,
  onChange,
}: {
  isPublic: boolean;
  openFields: readonly PublicProfileField[];
  disabled?: boolean;
  onChange: (next: PublicProfileChange) => void;
}) {
  const open = new Set(openFields);

  /** Перемикання одного поля: решта лишається, порядок — канонічний. */
  const toggleField = (field: PublicProfileField, next: boolean): PublicProfileField[] =>
    PUBLIC_PROFILE_FIELDS.filter((entry) =>
      entry === field ? next : open.has(entry),
    ) as PublicProfileField[];

  return (
    <div className="wb-switch-group">
      <SwitchRow
        label="Публічний профіль"
        hint="Вас видно в Просторі"
        checked={isPublic}
        disabled={disabled}
        onToggle={(next) => onChange({ isPublic: next, fields: [...openFields] })}
      />

      {isPublic && (
        <div className="wb-switch-fields">
          {PUBLIC_PROFILE_FIELDS.map((field) => (
            <SwitchRow
              key={field}
              label={PUBLIC_FIELD_LABELS[field]}
              checked={open.has(field)}
              disabled={disabled}
              onToggle={(next) => onChange({ isPublic: true, fields: toggleField(field, next) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
