/**
 * `FontPicker` — список шрифтів, у якому **кожен підпис набрано своїм шрифтом**.
 *
 * Це не прикраса: назва родини нічого не каже про те, як вона виглядає («Lora»,
 * «Manrope» — просто слова). Тому прев'ю справжнє: сторінка вибору завантажує
 * всі родини набору (`preloadFonts`), а підписи беруть їхні стеки.
 *
 * Перший пункт — **«Як у стилі»**: зняти свій шрифт законно, і без цього пункту
 * людині не було б як повернутись до типової типографіки бренду.
 *
 * Список згруповано за роллю родини (`FONT_KIND_LABELS`): тринадцять назв
 * підряд читаються як стіна, а «із засічками» й «моноширинні» — це те, що
 * людина справді шукає.
 *
 * @module packages/shared/src/components/theme/FontPicker
 */

import { useEffect, type CSSProperties, type ReactElement } from "react";
import { preloadFonts, releaseFontPreviews } from "../../styles/font-dom";
import { FONT_KIND_LABELS, THEME_FONTS, fontStack, type ThemeFontKind } from "../../styles/fonts";

/** Порядок груп — від типового до характерного. */
const KINDS: readonly ThemeFontKind[] = ["sans", "serif", "display", "mono"];

export interface FontPickerProps {
  /** Ідентифікатор вибраного шрифту; порожньо — «як у стилі». */
  value: string;
  onChange: (id: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps): ReactElement {
  // Прев'ю-родини живуть, доки відкритий список: тринадцять родин — це вага,
  // і тримати їх у застосунку після вибору нема чого.
  useEffect(() => {
    preloadFonts(THEME_FONTS.map((font) => font.id));
    return releaseFontPreviews;
  }, []);

  const chip = (id: string, label: string) => (
    <button
      key={id || "default"}
      type="button"
      className={`wb-font-chip${id === value ? " wb-font-chip--active" : ""}`}
      style={{ fontFamily: fontStack(id) ?? undefined } as CSSProperties}
      aria-pressed={id === value}
      onClick={() => onChange(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="wb-font-picker">
      {chip("", "Як у стилі")}
      {KINDS.map((kind) => (
        <div key={kind} className="wb-font-group">
          <span className="wb-font-group-label">{FONT_KIND_LABELS[kind]}</span>
          <div className="wb-font-chips">
            {THEME_FONTS.filter((font) => font.kind === kind).map((font) =>
              chip(font.id, font.labelUk),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
