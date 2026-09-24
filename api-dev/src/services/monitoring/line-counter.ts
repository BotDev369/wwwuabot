/**
 * Підрахунок рядків у файлі — код, коментарі, порожні.
 *
 * **Навіщо своє, а не бібліотека.** У воркері потрібен рахунок **потоком** (файл
 * приходить шматками з архіву) і без залежностей, які тягнуть `fs`. Тут рівно
 * один прохід по байтах і фіксована пам'ять на рядок.
 *
 * **Правило класифікації одне, і воно про перший значущий вміст рядка:**
 *
 *   • порожньо (самі пробіли) → порожній;
 *   • перший значущий вміст — початок коментаря → коментар;
 *   • якщо рядок **почався** всередині блочного коментаря і в ньому після
 *     закриття блоку є код — це код (у рядку справді є інструкції).
 *
 * **Це оцінка, а не парсер.** Однорядковий коментар усередині рядкового
 * літерала (адреса `https://…`) — код, бо значущий вміст почався раніше;
 * навпаки, JSX-коментар рахується кодом, бо починається з `{`. Обидві похибки
 * дрібні й **сталі**: важлива динаміка показника, а не його абсолютна істина,
 * тож різниця між зрізами від цього не страждає.
 *
 * @module api-dev/src/services/monitoring/line-counter
 */

/** Стиль коментарів у мові файлу. `none` — коментарів не шукаємо. */
export type CommentStyle = "slash" | "hash" | "dash" | "none";

export interface LineCounts {
  /** Усі рядки файлу. */
  lines: number;
  blank: number;
  comment: number;
  code: number;
}

/** Стан між рядками: блочний коментар не закінчується на межі рядка. */
export interface LineState {
  inBlock: boolean;
}

/**
 * Стеля буфера одного рядка: мініфікований файл — це мільйон символів в
 * одному рядку, і тримати його в пам'яті нема чого. Такий рядок і так код.
 */
const MAX_LINE = 512;

function isSpace(byte: number): boolean {
  return byte === 0x20 || byte === 9 || byte === 13 || byte === 12;
}

/** Чи є в рядку закриття блочного коментаря, починаючи з `from`. */
function closeBlockAt(bytes: readonly number[], from: number): number {
  for (let i = from; i + 1 < bytes.length; i++) {
    if (bytes[i] === 42 && bytes[i + 1] === 47) return i;
  }
  return -1;
}

/**
 * Класифікація одного рядка.
 *
 * Експортована окремо від лічильника: це чисте правило, і його можна
 * перевіряти без потоків і шматків.
 */
export function classifyLine(
  bytes: readonly number[],
  style: CommentStyle,
  state: LineState,
): "blank" | "code" | "comment" {
  let i = 0;
  let sawAny = false;

  while (i < bytes.length) {
    if (isSpace(bytes[i])) {
      i++;
      continue;
    }
    sawAny = true;

    if (state.inBlock) {
      const end = closeBlockAt(bytes, i);
      if (end < 0) return "comment";
      state.inBlock = false;
      i = end + 2;
      continue;
    }

    if (style === "slash" && bytes[i] === 47) {
      if (bytes[i + 1] === 47) return "comment";
      if (bytes[i + 1] === 42) {
        state.inBlock = true;
        i += 2;
        continue;
      }
      return "code";
    }
    if (style === "hash" && bytes[i] === 35) return "comment";
    if (style === "dash" && bytes[i] === 45 && bytes[i + 1] === 45) return "comment";

    return "code";
  }

  // Дійти сюди з `sawAny` можна лише одним шляхом: рядок почався в блочному
  // коментарі, коментар у ньому й закрився, а коду не лишилось.
  return sawAny ? "comment" : "blank";
}

export interface LineCounter {
  /** Шматок вмісту файлу. Межі рядків можуть бути будь-де. */
  push(chunk: Uint8Array): void;
  /** Підсумок. Кличеться один раз, і після нього лічильник не використовують. */
  counts(): LineCounts;
}

/** Лічильник рядків для одного файлу. */
export function createLineCounter(style: CommentStyle): LineCounter {
  const counts: LineCounts = { lines: 0, blank: 0, comment: 0, code: 0 };
  const state: LineState = { inBlock: false };
  let line: number[] = [];
  let overflowed = false;

  const flush = (): void => {
    const kind = overflowed ? "code" : classifyLine(line, style, state);
    counts.lines++;
    counts[kind]++;
    line = [];
    overflowed = false;
  };

  return {
    push(chunk: Uint8Array): void {
      for (let i = 0; i < chunk.length; i++) {
        const byte = chunk[i];
        if (byte === 10) {
          flush();
          continue;
        }
        if (line.length >= MAX_LINE) {
          overflowed = true;
          continue;
        }
        line.push(byte);
      }
    },

    counts(): LineCounts {
      // Файл без завершального `\n`: останній рядок теж рядок.
      if (line.length > 0 || overflowed) flush();
      return { ...counts };
    },
  };
}
