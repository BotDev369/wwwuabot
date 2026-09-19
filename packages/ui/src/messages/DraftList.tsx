/**
 * Чернетки — **окремий блок списку**, а не рядок розмови.
 *
 * Ненадісланий лист не належить розмові: у нього може не бути адресата взагалі,
 * а одній людині чернеток буває кілька — у рядку розмови для них просто немає
 * місця. Тому кожна чернетка — свій рядок, і саме звідси її відкривають, щоб
 * дописати й надіслати.
 *
 * **Рядок читають, тому він на всю ширину** — та сама розмітка, що в розмови
 * (`.wb-conv*`): підпис адресата, текст, час останньої правки. Розкладку
 * (рядки чи плитки) задає вибір людини тим самим кирпичиком
 * (`collectionViewClass`), тож чернетки не живуть за окремим правилом.
 *
 * Місце під аватар тримає **знак чернетки**, а не літера: чернетка не людина, і
 * літера на її місці читалась би як обличчя.
 *
 * @module @wwwuabot/ui/messages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { messageTime } from "@wwwuabot/shared/messages";
import { collectionViewClass } from "../collection";
import { DRAFTS_GROUP_LABEL, draftRecipientLabel } from "./drafts";
import { draftLine } from "./lines";
import type { DraftListProps } from "./types";

export function DraftList({
  drafts,
  peers,
  onOpen,
  collection,
}: DraftListProps): ReactElement | null {
  // Порожнього блока немає: «Чернеток: 0» — це заголовок без вмісту, а
  // відсутність чернеток і так видно зі списку розмов.
  if (drafts.length === 0) return null;

  return (
    <section className="wb-conv-group">
      <h2 className="wb-conv-group-title">
        {DRAFTS_GROUP_LABEL}
        <span className="wb-conv-group-count">{drafts.length}</span>
      </h2>

      <ul className={`wb-conv-list ${collectionViewClass(collection)}`}>
        {drafts.map((draft) => {
          const label = draftRecipientLabel(draft, peers);
          const line = draftLine(draft);

          return (
            <li key={draft.id} className="wb-conv-item">
              <button
                type="button"
                className="wb-conv"
                onClick={() => onOpen(draft)}
                // Рядок читається як «кому лист і що в ньому»: без підпису
                // скрінрідер прочитав би його суцільною фразою.
                aria-label={`${DRAFTS_GROUP_LABEL}. ${label}. ${line}`}
              >
                <span className="wb-conv-avatar">
                  <Icon name="save" size={20} />
                </span>

                <span className="wb-conv-main">
                  <span className="wb-conv-name">{label}</span>
                  <span className="wb-conv-last">{line}</span>
                </span>

                <span className="wb-conv-meta">
                  {/* Час — останньої правки, а не «створення»: чернетку саме
                      правлять, і саме це «коли я це писав». */}
                  <span className="wb-conv-time">{messageTime(draft.updatedAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
