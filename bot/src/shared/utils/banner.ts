import type { Env } from "../types/env";

export interface BannerConfig {
  lines: string[];
  bgColor: string; // hex без '#'
  width?: number;
  height?: number;
  align?: "left" | "center" | "right"; // лишаю для сумісності з render.ts; рендер завжди по центру
}

function normHex(color: string): string {
  const c = (color || "").replace("#", "").toLowerCase();
  return /^[0-9a-f]{6}$/.test(c) ? c : "1a56db";
}

// Cloudinary вимагає, щоб кома, слеш і відсоток у тексті оверлея були
// ПОДВІЙНО закодовані (%2C → %252C). Інакш кома читається як роздільник
// параметрів трансформації → 400. Кирилиця/пробіли лишаються як є.
function encodeText(text: string): string {
  return encodeURIComponent(text)
    .replace(/%25/g, "%2525")
    .replace(/%2C/g, "%252C")
    .replace(/%2F/g, "%252F");
}

// Банер за ПЕРЕВІРЕНИМ робочим шаблоном:
// ОДИН шар l_text, усі рядки через \n (%0A) всередині нього,
// fl_layer_apply,g_center без y-зміщень.
export function buildBanner(env: Env, cfg: BannerConfig): string {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const w = cfg.width ?? 600;
  const h = cfg.height ?? 300;
  const bg = normHex(cfg.bgColor);
  const text = cfg.lines
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .join("\n");

  const parts: string[] = [`w_${w},h_${h},c_fill,b_rgb:${bg}`];
  if (text) {
    parts.push(`l_text:Roboto_52:${encodeText(text)},co_white,c_fit,w_${w - 100}`);
    parts.push(`fl_layer_apply,g_center`);
  }
  return `https://res.cloudinary.com/${cloud}/image/upload/` + parts.join("/") + "/blank.png";
}
