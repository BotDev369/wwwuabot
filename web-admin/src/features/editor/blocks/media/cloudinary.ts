// Генератор Cloudinary-банера. Текст може бути багаторядковим:
// кожен рядок — окремий текстовий шар, складені по вертикалі.
export const CLOUDINARY_CLOUD = "ddoumoe5n";

export interface CloudinaryConfig {
  text: string;
  width: number;
  height: number;
  bgColor: string; // hex, '#' опціональний
  align: "left" | "center" | "right";
}

// Cloudinary l_text: кирилицю ЛИШАЄМО сирим UTF-8 (так працює,
// підтверджено робочими банерами), а пробіли та роздільники кодуємо.
function enc(text: string): string {
  return text
    .replace(/%/g, "%25")
    .replace(/ /g, "%20")
    .replace(/,/g, "%2C")
    .replace(/:/g, "%3A")
    .replace(/\//g, "%2F")
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
}

// Запобіжник: якщо прийшло щось дивне — падаємо в дефолт, а не ламаємо URL.
function normHex(color: string): string {
  const c = (color || "").replace("#", "").toLowerCase();
  return /^[0-9a-f]{6}$/.test(c) ? c : "1a56db";
}

export function buildCloudinaryUrl(cfg: CloudinaryConfig): string {
  const w = cfg.width || 600;
  const h = cfg.height || 420;
  const bg = normHex(cfg.bgColor);
  const lines = cfg.text.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const parts: string[] = [`w_${w},h_${h},c_fill,b_rgb:${bg}`];
  if (lines.length > 0) {
    const n = lines.length;
    const lineHeight = 56;
    const pad = 40;
    const textW = w - pad * 2;
    const font = "Arial_42_bold";
    lines.forEach((line, i) => {
      const y = Math.round((i - (n - 1) / 2) * lineHeight);
      const g =
        cfg.align === "left" ? `g_west,x_${pad}` :
          cfg.align === "right" ? `g_east,x_${pad}` :
            "g_center";
      parts.push(`l_text:${font}:${enc(line)},co_white,c_fit,w_${textW}`);
      parts.push(`fl_layer_apply,${g},y_${y}`);
    });
  }
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/` + parts.join("/") + "/blank.png";
}