/**
 * Розбір заголовка `tar`.
 *
 * Окремо від потоку навмисно: заголовок — це **формат** (поля, зсуви,
 * вісімкові числа), а потік — це стан (де ми стоїмо й що читаємо). Злиті в
 * одному файлі, вони дають понад 200 рядків, де половина стосується формату,
 * а половина — черговості; разом із тестами це вже нечитабельно (AGENTS.md §3).
 *
 * @module api-dev/src/services/monitoring/tar-header
 */

/** Розмір блоку `tar` — 512 байтів, і це не налаштування, а формат. */
export const BLOCK = 512;

/** Чи блок порожній (у `tar` два таких блоки завершують архів). */
export function isZeroBlock(block: Uint8Array): boolean {
  for (let i = 0; i < block.length; i++) if (block[i] !== 0) return false;
  return true;
}

/** ASCII-поле заголовка до першого `NUL`. */
export function ascii(bytes: Uint8Array, start: number, length: number): string {
  let end = start + length;
  for (let i = start; i < end; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Числове поле заголовка: вісімковий ASCII, а для великих розмірів — base-256.
 *
 * Base-256 (старший біт першого байта) потрібен не «про всяк випадок»: саме
 * так `tar` записує розмір, коли він не влізає у вісімкове поле.
 */
export function numericField(bytes: Uint8Array, start: number, length: number): number {
  if (bytes[start] & 0x80) {
    let value = bytes[start] & 0x7f;
    for (let i = start + 1; i < start + length; i++) value = value * 256 + bytes[i];
    return value;
  }
  let value = 0;
  for (let i = start; i < start + length; i++) {
    const byte = bytes[i];
    if (byte === 0 || byte === 32) break;
    if (byte < 48 || byte > 55) break;
    value = value * 8 + (byte - 48);
  }
  return value;
}

/** Ім'я файлу з заголовка: `prefix` (ustar) плюс `name`. */
export function headerPath(header: Uint8Array): string {
  const name = ascii(header, 0, 100);
  const prefix = ascii(header, 345, 155);
  return prefix ? `${prefix}/${name}` : name;
}

/** Розмір вмісту за заголовком. */
export function headerSize(header: Uint8Array): number {
  return numericField(header, 124, 12);
}

/** Тип запису: `0` — файл, `5` — тека, `x` — PAX, `L` — довге ім'я. */
export function headerType(header: Uint8Array): string {
  const type = String.fromCharCode(header[156]);
  return type === "\u0000" ? "0" : type;
}

/** Шлях із PAX-запису (`path=…`) — так приїжджають імена, довші за 100 байтів. */
export function paxPath(text: string): string | null {
  for (const line of text.split("\n")) {
    const index = line.indexOf("path=");
    if (index >= 0) return line.slice(index + "path=".length).trim();
  }
  return null;
}
