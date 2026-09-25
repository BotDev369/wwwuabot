/**
 * Фото товару: завантажити й приєднати — два різні кроки, і це видно з екрана.
 *
 * **Файл спершу стає рядком обліку, потім його приєднують.** Між цими кроками
 * він уже існує, і саме тому бібліотека магазину лежить поруч із галереєю
 * товару: одне фото може стояти в кількох товарах, а те, що завантажили
 * випадково, прибирають **із бібліотеки** — не «десь у налаштуваннях»
 * (`docs/SHOPS.md` §5).
 *
 * **Порядок — це `images` товару, а не порядок сітки.** Перший вибраний номер і
 * є головним: саме його видно в каталозі. Тому вибрані стоять попереду й
 * по порядку, а решта бібліотеки — після них.
 *
 * **Вибір — дотик по фото**, без окремого чекбокса: маленький тап-таргет поруч
 * із картинкою лише змушував би цілитись (той самий висновок, що в списку
 * шаблонів).
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useRef, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  SHOP_MEDIA_IMAGE_TYPES,
  SHOP_MEDIA_MAX_BYTES,
  formatBytes,
  imageTypesLabel,
  mediaUrl,
  type ShopMedia,
} from "@wwwuabot/shared/shop";
import { useDialog } from "@wwwuabot/ui/dialog";

/** Що приймає вікно вибору файлу: той самий перелік, що перевіряє сервер. */
const ACCEPT = SHOP_MEDIA_IMAGE_TYPES.join(",");

export function ShopPhotoField({
  library,
  images,
  onChange,
  onUpload,
  onDeleteFile,
  inUse,
}: {
  library: ShopMedia[];
  images: number[];
  onChange: (images: number[]) => void;
  onUpload: (file: File) => Promise<ShopMedia>;
  /** Прибрати файл із бібліотеки — разом із байтами в сховищі. */
  onDeleteFile: (id: number) => Promise<void>;
  /** Чи стоїть файл у якомусь товарі: про це кажуть **до** видалення. */
  inUse: (id: number) => boolean;
}): ReactElement {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(library.map((file) => [file.id, file]));
  const selected = images.map((id) => byId.get(id)).filter((file): file is ShopMedia => !!file);
  const rest = library.filter((file) => !images.includes(file.id));

  function toggle(id: number): void {
    onChange(images.includes(id) ? images.filter((item) => item !== id) : [...images, id]);
  }

  async function pick(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      // Список тримаємо локально: файли завантажуються по черзі, і кожен
      // наступний мусить бачити вже додані попередні.
      let next = [...images];
      for (const file of Array.from(files)) {
        const stored = await onUpload(file);
        next = [...next, stored.id];
        onChange(next);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити фото");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function dropFile(file: ShopMedia): Promise<void> {
    const used = inUse(file.id);
    const confirmed = await dialog.confirm(
      used
        ? `Це фото стоїть у товарі — його галерея втратить знімок. Прибрати файл?`
        : `Прибрати фото з бібліотеки магазину?`,
      { title: "Видалення", tone: "danger", confirmText: "Прибрати" },
    );
    if (!confirmed) return;

    try {
      await onDeleteFile(file.id);
      onChange(images.filter((id) => id !== file.id));
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати файл", {
        title: "Помилка",
      });
    }
  }

  return (
    <div className="wb-field">
      <span className="wb-label">Фото</span>

      <div className="shop-photo-grid">
        {selected.map((file, index) => (
          <div className="shop-photo" key={file.id}>
            <button
              type="button"
              className="shop-photo-pick"
              onClick={() => toggle(file.id)}
              aria-label="Прибрати з галереї"
            >
              <img className="shop-photo-img" src={mediaUrl(file.key)} alt="" loading="lazy" />
            </button>
            {index === 0 && <span className="shop-photo-badge">головне</span>}
          </div>
        ))}

        <button
          type="button"
          className="shop-photo-add"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          <Icon name={busy ? "refresh" : "upload"} size={18} />
          <span className="shop-photo-add-text">{busy ? "Завантаження…" : "Додати фото"}</span>
        </button>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="shop-photo-input"
        onChange={(event) => void pick(event.target.files)}
      />

      {error && <p className="wb-text-red">{error}</p>}

      {rest.length > 0 && (
        <>
          {/* Бібліотека — не «ще одна галерея»: дотик тут додає файл у товар, а
              кошик прибирає його з магазину цілком. Тому це підпис, а не
              заголовок: мова про вміст того самого поля. */}
          <span className="wb-text-muted shop-photo-label">
            Уже в магазині — торкніться, щоб додати до товару
          </span>
          <div className="shop-photo-grid">
            {rest.map((file) => (
              <div className="shop-photo" key={file.id}>
                <button
                  type="button"
                  className="shop-photo-pick shop-photo-pick--dim"
                  onClick={() => toggle(file.id)}
                  aria-label="Додати до товару"
                >
                  <img className="shop-photo-img" src={mediaUrl(file.key)} alt="" loading="lazy" />
                </button>
                <button
                  type="button"
                  className="shop-photo-drop"
                  onClick={() => void dropFile(file)}
                  aria-label="Прибрати з бібліотеки"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <span className="wb-text-muted shop-photo-label">
        {imageTypesLabel()}, до {formatBytes(SHOP_MEDIA_MAX_BYTES)} на файл
      </span>
    </div>
  );
}
