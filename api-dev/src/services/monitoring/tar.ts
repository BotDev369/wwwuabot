/**
 * Потоковий читач `tar` — те, що дозволяє рахувати код із архіву GitHub.
 *
 * **Навіщо архів.** Щоб дізнатись, скільки в репозиторії рядків, файлів і
 * байтів, потрібен **вміст** файлів: API GitHub віддає лише розміри блобів, а
 * «рядків» не має взагалі. Архів гілки (`/repos/{repo}/tarball/{ref}`) — це
 * один запит замість сотень, і саме тому він тут.
 *
 * **Чому потік, а не «завантажити й розібрати».** Воркер має обмеження
 * пам'яті та часу: архів цілком — це десятки мегабайт на кожен зріз. Потоком
 * байти проходять наскрізь: заголовок → дані файлу → відступ → наступний.
 * Тому цей клас не тримає вмісту файлів узагалі — лише кличе обробники.
 *
 * **Це чиста логіка.** Мережі тут немає: `push()` приймає вже розпаковані
 * байти, тож парсер тестується власним архівом у тесті, а не живим GitHub.
 * Формат заголовка розібрано окремо — `tar-header.ts`.
 *
 * @module api-dev/src/services/monitoring/tar
 */

import {
  BLOCK,
  ascii,
  headerPath,
  headerSize,
  headerType,
  isZeroBlock,
  paxPath,
} from "./tar-header";

/** Стеля буфера для PAX-заголовка: довгі шляхи приїжджають у ньому. */
const PAX_LIMIT = 16 * 1024;

export interface TarHandlers {
  /** Початок файлу: ім'я вже знайдене, далі підуть `onData`. */
  onFile?(path: string, size: number): void;
  /** Шматок вмісту файлу — рівно в тому порядку, у якому він в архіві. */
  onData?(chunk: Uint8Array): void;
  onFileEnd?(path: string, size: number): void;
}

/** Куди подіти дані поточної позиції. */
type Sink = "file" | "skip" | "pax" | "longname";

type Mode = "header" | "data" | "padding" | "done";

/**
 * Потоковий розбір архіву: `push()` — шматок байтів, обробники — те, що
 * потрібно знати про вміст.
 */
export class TarStream {
  private mode: Mode = "header";
  private header = new Uint8Array(BLOCK);
  private filled = 0;
  private left = 0;
  private padding = 0;
  private sink: Sink = "file";
  private path = "";
  private size = 0;
  private buffer: number[] | null = null;
  private paxName: string | null = null;
  private longName: string | null = null;

  constructor(private readonly handlers: TarHandlers) {}

  push(chunk: Uint8Array): void {
    let offset = 0;

    while (offset < chunk.length && this.mode !== "done") {
      if (this.mode === "header") {
        const take = Math.min(BLOCK - this.filled, chunk.length - offset);
        this.header.set(chunk.subarray(offset, offset + take), this.filled);
        this.filled += take;
        offset += take;
        if (this.filled < BLOCK) continue;
        this.filled = 0;
        this.startEntry();
        continue;
      }

      if (this.mode === "padding") {
        const take = Math.min(this.padding, chunk.length - offset);
        this.padding -= take;
        offset += take;
        if (this.padding === 0) this.mode = "header";
        continue;
      }

      const take = Math.min(this.left, chunk.length - offset);
      const slice = chunk.subarray(offset, offset + take);
      offset += take;
      this.left -= take;
      this.consume(slice);
      if (this.left === 0) this.finishEntry();
    }
  }

  /** Дані поточної позиції: або у файл, або у власний буфер (PAX, довге ім'я). */
  private consume(slice: Uint8Array): void {
    if (this.sink === "file") {
      this.handlers.onData?.(slice);
      return;
    }
    if (this.sink === "skip") return;
    const buffer = this.buffer;
    if (!buffer || buffer.length >= PAX_LIMIT) return;
    for (let i = 0; i < slice.length && buffer.length < PAX_LIMIT; i++) buffer.push(slice[i]);
  }

  /** Заголовок прочитано: вирішуємо, що це за запис і куди його дані. */
  private startEntry(): void {
    if (isZeroBlock(this.header)) {
      this.mode = "done";
      return;
    }

    const type = headerType(this.header);
    const size = headerSize(this.header);
    this.size = size;
    this.left = size;

    if (type === "x" || type === "g") {
      this.sink = "pax";
      this.buffer = [];
    } else if (type === "L") {
      this.sink = "longname";
      this.buffer = [];
    } else if (type === "0") {
      this.sink = "file";
      this.path = this.paxName ?? this.longName ?? headerPath(this.header);
      this.paxName = null;
      this.longName = null;
      this.handlers.onFile?.(this.path, size);
    } else {
      // Теки, посилання, пристрої — у метрики не входять, але їхні байти
      // треба прочитати, інакше зіб'ється позиція.
      this.sink = "skip";
    }

    this.mode = "data";
    if (this.left === 0) this.finishEntry();
  }

  /** Запис дочитано: буфер розбираємо, позицію переводимо на наступний. */
  private finishEntry(): void {
    if (this.sink === "file") {
      this.handlers.onFileEnd?.(this.path, this.size);
    } else if (this.sink === "pax" && this.buffer) {
      this.paxName = paxPath(ascii(Uint8Array.from(this.buffer), 0, this.buffer.length));
    } else if (this.sink === "longname" && this.buffer) {
      this.longName = ascii(Uint8Array.from(this.buffer), 0, this.buffer.length).trim();
    }

    this.buffer = null;
    const rest = this.size % BLOCK;
    if (rest === 0) {
      this.mode = "header";
    } else {
      this.padding = BLOCK - rest;
      this.mode = "padding";
    }
  }
}
