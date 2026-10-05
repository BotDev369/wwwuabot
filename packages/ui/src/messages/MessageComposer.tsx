/**
 * Поле вводу повідомлення — той рядок, куди пише рука.
 *
 * Форма у **смузі поверхні**, а не останнім рядком тіла: тіло прокручується, і
 * поле разом із ним зникає саме тоді, коли його шукають. Кирпичик смуги тут свій —
 * `.wb-thread-bar` (він несе відступ під безпечну зону), а не спільний.
 *
 * **Фото — окремим рядком над смугою** (`.wb-thread-preview`), а не замість поля:
 * скрин і слова йдуть разом, і фото після невдалого надсилання мусить лишатися.
 *
 * **Завантаження — одразу після вибору**: надсилання лишається тим самим кроком
 * для тексту й фото, а файл іде окремим запитом.
 *
 * @module @wwwuabot/ui/messages
 */

import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MEDIA_IMAGE_TYPES } from "@wwwuabot/shared/files";
import { isSendableMessage, MAX_MESSAGE_BODY, messageMediaUrl } from "@wwwuabot/shared/messages";

/** Фото вже прикріплене: його лишилось лише надіслати разом із текстом. */
interface Attachment {
  id: number;
  url: string;
}

interface MessageComposerProps {
  sending?: boolean;
  /**
   * Прикріпити фото; повертає **номер** рядка обліку, з яким воно піде в
   * повідомлення, і його ключ — за ним будується адреса знімка. Завантажує
   * оболонка: вона одна знає транспорт і ідентичність.
   *
   * `undefined` — оболонка не вміє завантажувати файли: тоді кнопки прикріплення
   * немає, а не «є, але мовчить».
   */
  onAttach?: (file: File) => Promise<{ id: number; key: string }>;
  /**
   * Надіслати; `true` — сервер підтвердив (див. нижче про очищення поля).
   *
   * `mediaId` — прикріплене фото або `null`; текст при цьому може бути
   * порожнім, бо фото сам по собі — вже повідомлення.
   */
  onSend: (body: string, mediaId: number | null) => Promise<boolean>;
}

export function MessageComposer({
  sending = false,
  onAttach,
  onSend,
}: MessageComposerProps): ReactElement {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const sendable = isSendableMessage(draft, attachment !== null) && !sending && !attaching;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!sendable) return;

    // Поле чистимо **після** підтвердження сервера. Очистити до нього — це
    // втрачений текст на кожній обірваній мережі: людина писала б його знову,
    // і винною виглядала б вона.
    if (!(await onSend(draft, attachment?.id ?? null))) return;

    setDraft("");
    setAttachment(null);
  }

  async function pick(files: FileList | null): Promise<void> {
    const file = files?.[0];
    if (!file || !onAttach) return;

    setAttaching(true);
    setError(null);

    try {
      const media = await onAttach(file);
      setAttachment({ id: media.id, url: messageMediaUrl(media.key) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити фото");
    } finally {
      setAttaching(false);
      // Вибраний файл лишається в полі вибору, а наступний дотик обрав би те саме.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <form className="wb-thread-form" onSubmit={(event) => void submit(event)}>
      {attachment && (
        <div className="wb-thread-preview">
          <img className="wb-thread-preview-img" src={attachment.url} alt="Прикріплене фото" />
          <button
            type="button"
            className="wb-thread-preview-drop"
            onClick={() => setAttachment(null)}
            aria-label="Прибрати фото"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {error && <p className="wb-text-red wb-thread-error">{error}</p>}

      <div className="wb-thread-bar">
        {onAttach && (
          <>
            <button
              type="button"
              className="wb-thread-attach"
              onClick={() => input.current?.click()}
              disabled={attaching || attachment !== null}
              aria-label="Прикріпити фото"
              title="Прикріпити фото"
            >
              <Icon name={attaching ? "refresh" : "image"} size={20} />
            </button>
            {/* Вікно вибору — невидиме: кнопка вже є, а друга така сама дія
                поруч читалася б як «вибрати файл» і «прикріпити» окремо. */}
            <input
              ref={input}
              type="file"
              accept={MEDIA_IMAGE_TYPES.join(",")}
              className="wb-thread-file"
              onChange={(event) => void pick(event.target.files)}
            />
          </>
        )}

        <input
          type="text"
          className="wb-input wb-thread-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={attachment ? "Підпис до фото…" : "Повідомлення…"}
          aria-label="Текст повідомлення"
          maxLength={MAX_MESSAGE_BODY}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          className="wb-thread-send"
          disabled={!sendable}
          aria-label="Надіслати"
        >
          <Icon name="arrow-up" size={20} />
        </button>
      </div>
    </form>
  );
}
