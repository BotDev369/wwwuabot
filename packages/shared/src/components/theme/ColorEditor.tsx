/**
 * `ColorEditor` — розширений вибір кольору: три повзунки й код.
 *
 * Палітра готових трійок обмежена навмисно, і саме тому тут є **повзунки**:
 * «хочу свій» не має впиратися в чужі кольори. Відтінок / насиченість /
 * світність — це те, як про колір думає людина; код `#rrggbb` — те, як його
 * хочеться вставити з макета. Обидва входи ведуть до одного значення.
 *
 * Кнопка «Прибрати» лишає слот порожнім **навмисно**: саме так видно правило
 * «зберегти можна лише коли задані всі три» — кнопка збереження чекає, а
 * панель називає, чого бракує.
 *
 * @module packages/shared/src/components/theme/ColorEditor
 */

import { useEffect, useState, type ReactElement } from "react";
import { hexToHsl, hslToHex, normalizeHex, type Hsl } from "../../styles/color";

interface ColorEditorProps {
  /** Поточний колір слота — або `""`, коли його прибрали. */
  value: string;
  onChange: (value: string) => void;
}

/** Звідки починають повзунки, коли колір прибрали: нейтральний, не «випадковий». */
const FALLBACK: Hsl = { h: 220, s: 55, l: 50 };

interface ChannelDefinition {
  key: keyof Hsl;
  labelUk: string;
  max: number;
  suffix: string;
}

const CHANNELS: readonly ChannelDefinition[] = [
  { key: "h", labelUk: "Відтінок", max: 360, suffix: "°" },
  { key: "s", labelUk: "Насиченість", max: 100, suffix: "%" },
  { key: "l", labelUk: "Світність", max: 100, suffix: "%" },
];

export function ColorEditor({ value, onChange }: ColorEditorProps): ReactElement {
  const hsl = hexToHsl(value) ?? FALLBACK;
  const [code, setCode] = useState(value);

  // Зовнішня зміна (палітра, «Прибрати») мусить доїхати й до поля коду.
  useEffect(() => setCode(value), [value]);

  const setChannel = (key: keyof Hsl, next: number) => {
    onChange(hslToHex({ ...hsl, [key]: next }));
  };

  const handleCode = (raw: string) => {
    setCode(raw);
    const normalized = normalizeHex(raw);
    if (normalized) onChange(normalized);
  };

  return (
    <div className="wb-theme-editor">
      {CHANNELS.map((channel) => (
        <label key={channel.key} className="wb-theme-slider-row">
          <span className="wb-theme-slider-label">{channel.labelUk}</span>
          <input
            type="range"
            className="wb-theme-slider"
            min={0}
            max={channel.max}
            value={Math.round(hsl[channel.key])}
            onChange={(event) => setChannel(channel.key, Number(event.target.value))}
            aria-label={channel.labelUk}
          />
          <span className="wb-theme-slider-value">
            {Math.round(hsl[channel.key])}
            {channel.suffix}
          </span>
        </label>
      ))}

      <div className="wb-theme-editor-foot">
        <input
          type="text"
          className="wb-input wb-theme-code"
          value={code}
          onChange={(event) => handleCode(event.target.value)}
          placeholder="#rrggbb"
          aria-label="Код кольору"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="wb-btn wb-btn-ghost wb-btn-sm"
          onClick={() => onChange("")}
        >
          Прибрати
        </button>
      </div>
    </div>
  );
}
