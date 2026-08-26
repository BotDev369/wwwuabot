import { useState } from "react";
import { buildCloudinaryUrl, type CloudinaryConfig } from "./cloudinary";

export interface PhotoConfig extends Partial<CloudinaryConfig> {
  source: "cloudinary" | "url";
  url?: string;
}

interface Props {
  media: string;
  config: PhotoConfig | null;
  onChange: (next: { media: string; config: PhotoConfig | null }) => void;
}

export function PhotoPicker({ media, config, onChange }: Props) {
  const [tab, setTab] = useState<"cloudinary" | "url">(config?.source ?? "url");
  const [text, setText] = useState(config?.text ?? "");
  const [width, setWidth] = useState(config?.width ?? 600);
  const [height, setHeight] = useState(config?.height ?? 420);
  const [bgColor, setBgColor] = useState(config?.bgColor ?? "1a56db");
  const [align, setAlign] = useState<"left" | "center" | "right">(config?.align ?? "center");
  const [url, setUrl] = useState(config?.source === "url" ? (config.url ?? media) : media);
  const [previewUrl, setPreviewUrl] = useState(media || "");

  function showCloudinary() {
    const cfg: CloudinaryConfig = { text, width, height, bgColor, align };
    const u = buildCloudinaryUrl(cfg);
    setPreviewUrl(u);
    onChange({ media: u, config: { source: "cloudinary", text, width, height, bgColor, align } });
  }

  function handleUrlChange(v: string) {
    setUrl(v);
    setPreviewUrl(v);
    onChange({ media: v, config: { source: "url", url: v } });
  }

  return (
    <div className="photo-picker">
      <div className="photo-tabs">
        <button
          type="button"
          className={`photo-tab${tab === "cloudinary" ? " photo-tab--active" : ""}`}
          onClick={() => setTab("cloudinary")}
        >
          Cloudinary
        </button>
        <button
          type="button"
          className={`photo-tab${tab === "url" ? " photo-tab--active" : ""}`}
          onClick={() => setTab("url")}
        >
          R2 / URL
        </button>
      </div>

      {tab === "cloudinary" ? (
        <div className="photo-fields">
          <textarea
            className="block-textarea"
            rows={3}
            value={text}
            placeholder={"Текст банера...\n(кожен рядок — з нового рядка)"}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="photo-row">
            <label>Розмір</label>
            <input
              className="block-input"
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
            />
            <span>×</span>
            <input
              className="block-input"
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="photo-row">
            <label>Колір фону</label>
            <input
              type="color"
              value={`#${bgColor.replace("#", "")}`}
              onChange={(e) => setBgColor(e.target.value.replace("#", ""))}
            />
            <label>Вирівнювання</label>
            <select
              className="block-select"
              value={align}
              onChange={(e) => setAlign(e.target.value as "left" | "center" | "right")}
            >
              <option value="left">Ліво</option>
              <option value="center">Центр</option>
              <option value="right">Право</option>
            </select>
          </div>
          <button type="button" className="photo-show-btn" onClick={showCloudinary}>
            Показати / Оновити
          </button>
        </div>
      ) : (
        <div className="photo-fields">
          <input
            className="block-input"
            value={url}
            placeholder="https://… (публічний URL з R2 або інший)"
            onChange={(e) => handleUrlChange(e.target.value)}
          />
        </div>
      )}

      {previewUrl && (
        <div className="photo-preview">
          <img src={previewUrl} alt="" />
          <p className="photo-preview-url">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              {previewUrl}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
