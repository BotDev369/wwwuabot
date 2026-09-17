/**
 * `ColorEditor` — вибір кольору: зразки, системна палітра, повзунки й код.
 *
 * Палітра готових трійок обмежена навмисно, і саме тому тут є **зразки**: людина
 * не знає кодів кольорів, і «введи #4f7cff» — це не вибір, а диктант. Тому
 * спершу йде те, що можна **взяти дотиком**: сітка кольорів і смуга від чорного
 * до білого. Далі — системний вибір кольору (`input type="color"`): він дає всю
 * гаму, піпетку й олівець там, де браузер це вміє. І аж потім — точність:
 * повзунки H/S/L і код `#rrggbb`, бо доріжки повзунків намальовані тією ж гамою,
 * тож і вони читаються очима, а не числом.
 *
 * Кнопка «Прибрати» лишає слот порожнім **навмисно**: саме так видно правило
 * «зберегти можна лише коли задані всі три» — кнопка збереження чекає, а
 * панель називає, чого бракує.
 *
 * @module packages/shared/src/components/theme/ColorEditor
 */

import { useEffect, useState, type ReactElement } from "react";
import { hexToHsl, hslToHex, normalizeHex, type Hsl } from "../../styles/color";
import { COLOR_CHART, COLOR_SHADES, HUE_TRACK, channelTrack } from "../../styles/color-presets";

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
  // Порожній слот усе одно має що показати: системному вибору потрібен колір,
  // а не пустий рядок.
  const current = normalizeHex(value) ?? hslToHex(FALLBACK);
  const [code, setCode] = useState(value);

  // Зовнішня зміна (зразок, «Прибрати») мусить доїхати й до поля коду.
  useEffect(() => setCode(value), [value]);

  const setChannel = (key: keyof Hsl, next: number) => {
    onChange(hslToHex({ ...hsl, [key]: next }));
  };

  const handleCode = (raw: string) => {
    setCode(raw);
    const normalized = normalizeHex(raw);
    if (normalized) onChange(normalized);
  };

  const track = (key: keyof Hsl) => (key === "h" ? HUE_TRACK : channelTrack(key, hsl));

  return (
    <div className="wb-theme-editor">
      {/* Системна палітра: уся гама, піпетка, недавні кольори. Клікабельний
          весь рядок — поле вводу розтягнуте поверх нього прозорим шаром. */}
      <div className="wb-theme-picker">
        <span
          className="wb-theme-picker-swatch"
          style={{ background: current }}
          aria-hidden="true"
        />
        <span className="wb-theme-picker-text">
          <span className="wb-theme-picker-label">Уся гама кольорів</span>
          <span className="wb-theme-picker-hint">Системна палітра, піпетка й олівець</span>
        </span>
        <input
          type="color"
          className="wb-theme-picker-input"
          value={current}
          onChange={(event) => onChange(normalizeHex(event.target.value) ?? event.target.value)}
          aria-label="Відкрити системну палітру"
        />
      </div>

      <div className="wb-theme-chart">
        <span className="wb-theme-caption">Зразки</span>
        <div className="wb-theme-chips">
          {COLOR_CHART.flatMap((row) =>
            row.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`wb-theme-chip${hex === current ? " wb-theme-chip--active" : ""}`}
                style={{ background: hex }}
                onClick={() => onChange(hex)}
                aria-label={hex}
                aria-pressed={hex === current}
              />
            )),
          )}
        </div>
        <div className="wb-theme-chips wb-theme-chips--shades">
          {COLOR_SHADES.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`wb-theme-chip${hex === current ? " wb-theme-chip--active" : ""}`}
              style={{ background: hex }}
              onClick={() => onChange(hex)}
              aria-label={hex}
              aria-pressed={hex === current}
            />
          ))}
        </div>
      </div>

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
            style={{ backgroundImage: track(channel.key) }}
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
