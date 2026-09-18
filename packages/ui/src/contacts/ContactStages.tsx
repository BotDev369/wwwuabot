/**
 * Етапи приєднання — три кроки, і видно **всі**, навіть непройдені.
 *
 * «Запрошено → зайшов у бота → зайшов на платформу» — це лійка, і саме різниця
 * між другим і третім кроком і є те, заради чого екран існує: людина може зайти
 * в бота за лінком і **не** відкрити Mini App. Показати лише пройдене означало б
 * сховати саме цю різницю.
 *
 * Дати ставить не власник: вхід у бота фіксує бот (`ctx.from`), вхід на
 * платформу — `api-dev`, за підписаним `initData`. Тому id людини тут **видно**,
 * але не редаговано (AGENTS.md §7).
 *
 * @module @wwwuabot/ui/contacts
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Contact } from "@wwwuabot/shared/contacts";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";

/** Один етап: що сталося, коли і з чим. */
function StageRow({
  done,
  label,
  value,
  note,
}: {
  done: boolean;
  label: string;
  value: string;
  note?: string;
}): ReactElement {
  return (
    <li className={`wb-contact-stage${done ? " wb-contact-stage--done" : ""}`}>
      {/* Знак каже стан **разом** із словом: галочка для пройденого кроку,
          риска — для того, що ще ні. Порожня крапка читалась би як завантаження. */}
      <Icon name={done ? "check" : "minus"} size={14} />
      <span className="wb-contact-stage-label">{label}</span>
      <span className="wb-contact-stage-value">
        {value}
        {note && <span className="wb-contact-stage-note"> {note}</span>}
      </span>
    </li>
  );
}

export function ContactStages({ contact }: { contact: Contact }): ReactElement {
  return (
    <ol className="wb-contact-stages">
      <StageRow
        done={contact.code !== null}
        label="Запрошено"
        value={contact.code ? "лінк складено" : "лінка немає"}
      />
      <StageRow
        done={contact.joinedBotAt !== null}
        label="Зайшов у бота"
        value={contact.joinedBotAt ? formatStamp(contact.joinedBotAt) : "ще ні"}
        note={contact.joinedUserId !== null ? `· id ${contact.joinedUserId}` : undefined}
      />
      <StageRow
        done={contact.joinedPlatformAt !== null}
        label="Зайшов на платформу"
        value={contact.joinedPlatformAt ? formatStamp(contact.joinedPlatformAt) : "ще ні"}
      />
    </ol>
  );
}
