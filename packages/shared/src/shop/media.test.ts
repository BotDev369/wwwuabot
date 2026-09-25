import { describe, expect, it } from "vitest";
import {
  SHOP_MEDIA_IMAGE_LABELS,
  SHOP_MEDIA_IMAGE_TYPES,
  SHOP_MEDIA_MAX_BYTES,
  formatBytes,
  imageTypesLabel,
  isImageMime,
  isShopMediaKey,
  mediaKey,
  mediaRandomToken,
  mediaUrl,
  safeMediaName,
  validateMediaUpload,
} from "./media";

describe("safeMediaName", () => {
  it("тримає розширення окремо від перекладу", () => {
    // Крапка, яку `transliterateSlug` замінює дефісом, не має з'їсти `.jpg`:
    // інакше файл приїхав би як `kava-na-rozi-jpg` без типу.
    expect(safeMediaName("Кава на розі.jpg")).toBe("kava-na-rozi.jpg");
    expect(safeMediaName("photo (1).PNG")).toBe("photo-1.png");
  });

  it("без розширення лишає саме ім'я", () => {
    expect(safeMediaName("Мій файл")).toBe("mii-fail");
  });

  it("порожнє або не-рядок дає робоче ім'я, а не порожній хвіст ключа", () => {
    expect(safeMediaName("")).toBe("file");
    expect(safeMediaName(null)).toBe("file");
    // Ім'я, що складається з самої крапки, без розширення: хвіст ключа не
    // може бути порожнім, але й вигадувати йому тип нема звідки.
    expect(safeMediaName(".jpg")).toBe("jpg");
  });
});

describe("mediaKey", () => {
  it("тримає магазин у ключі — за ним рахують квоту й прибирають файли", () => {
    const key = mediaKey(12, "Кава.jpg", "a1b2c3");
    expect(key).toBe("shop/12/a1b2c3-kava.jpg");
    expect(isShopMediaKey(key)).toBe(true);
  });

  it("випадкова частка щоразу інша", () => {
    expect(mediaRandomToken()).not.toBe(mediaRandomToken());
    expect(mediaRandomToken()).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("mediaUrl", () => {
  it("адреса будується з ключа — у рядку бази лежить ключ, а не адреса", () => {
    expect(mediaUrl("shop/12/a1b2c3-kava.jpg")).toBe("/api/shop/media/shop/12/a1b2c3-kava.jpg");
  });
});

describe("isShopMediaKey", () => {
  it("не пускає вихід угору й чужі префікси", () => {
    expect(isShopMediaKey("shop/1/a-kava.jpg")).toBe(true);
    expect(isShopMediaKey("shop/1/../../secrets.txt")).toBe(false);
    expect(isShopMediaKey("shop/1/a\\b.jpg")).toBe(false);
    expect(isShopMediaKey("other/1/a.jpg")).toBe(false);
    expect(isShopMediaKey("shop/")).toBe(false);
    expect(isShopMediaKey(7)).toBe(false);
  });
});

describe("imageTypesLabel", () => {
  it("називає рівно ті формати, які приймає сервер", () => {
    // Підказка у формі й перевірка в api-dev черпають з одного переліку: якщо
    // вони розійдуться, людина побачить обіцянку, якої ніхто не виконає.
    expect(SHOP_MEDIA_IMAGE_LABELS.length).toBe(SHOP_MEDIA_IMAGE_TYPES.length);
    expect(imageTypesLabel()).toBe("JPEG, PNG, WebP, AVIF або GIF");
  });
});

describe("isImageMime", () => {
  it("розуміє MIME з параметрами й не вважає картинкою SVG", () => {
    expect(isImageMime("image/jpeg")).toBe(true);
    expect(isImageMime("image/png; charset=binary")).toBe(true);
    // SVG — документ зі скриптами, а не фото: показувати його не можна.
    expect(isImageMime("image/svg+xml")).toBe(false);
    expect(isImageMime("application/pdf")).toBe(false);
  });
});

describe("validateMediaUpload", () => {
  it("бере фотографію дозволеного типу", () => {
    expect(validateMediaUpload({ mime: "image/webp", bytes: 1024 })).toEqual({
      ok: true,
      kind: "image",
    });
  });

  it("відмовляє до читання байтів: тип, порожній файл, перебір", () => {
    const big = validateMediaUpload({ mime: "image/png", bytes: SHOP_MEDIA_MAX_BYTES + 1 });
    expect(big.ok).toBe(false);
    expect(big.ok === false && big.message).toContain("МБ");

    expect(validateMediaUpload({ mime: "image/png", bytes: 0 }).ok).toBe(false);
    expect(validateMediaUpload({ mime: "application/pdf", bytes: 10 }).ok).toBe(false);
    expect(validateMediaUpload({ mime: undefined, bytes: 10 }).ok).toBe(false);
  });
});

describe("formatBytes", () => {
  it("показує розмір так, як його читає людина", () => {
    expect(formatBytes(840)).toBe("840 Б");
    expect(formatBytes(2048)).toBe("2 КБ");
    expect(formatBytes(1_500_000)).toBe("1,4 МБ");
    expect(formatBytes(0)).toBe("—");
  });
});
