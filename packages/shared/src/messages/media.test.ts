/**
 * Правила фото в листуванні: ключ, адреса й межа на людину.
 *
 * Перевіряємо те, що ламається мовчки: адреса будується з ключа (у базі лежить
 * ключ, а не адреса), ключ не підпускає вихід угору, і ліміт файлів існує.
 *
 * @module @wwwuabot/shared/messages/media.test
 */

import { describe, expect, it } from "vitest";
import { MEDIA_IMAGE_TYPES } from "../files";
import {
  MESSAGE_MEDIA_PER_USER,
  isMessageMediaKey,
  messageMediaKey,
  messageMediaUrl,
} from "./media";
import { mediaRandomToken } from "../files";
import { isSendableMessage } from "./fields";

describe("messageMediaKey", () => {
  it("тримає людину у ключі — за нею рахують квоту й прибирають файли", () => {
    const key = messageMediaKey(42, "Скрін.png", "a1b2c3");

    expect(key).toBe("msg/42/a1b2c3-skrin.png");
    expect(isMessageMediaKey(key)).toBe(true);
  });

  it("випадкова частина щоразу інша", () => {
    expect(mediaRandomToken()).not.toBe(mediaRandomToken());
  });
});

describe("messageMediaUrl", () => {
  it("адреса будується з ключа — у рядку бази лежить ключ, а не адреса", () => {
    expect(messageMediaUrl("msg/42/a1b2c3-skrin.png")).toBe(
      "/api/messages/media/msg/42/a1b2c3-skrin.png",
    );
  });
});

describe("isMessageMediaKey", () => {
  it("не пускає вихід угору й чужий простір (фото магазину — не наше)", () => {
    expect(isMessageMediaKey("msg/1/a-skrin.png")).toBe(true);
    expect(isMessageMediaKey("msg/1/../../secrets.txt")).toBe(false);
    expect(isMessageMediaKey("msg/1/a\\b.png")).toBe(false);
    expect(isMessageMediaKey("shop/1/a.jpg")).toBe(false);
    expect(isMessageMediaKey("msg/")).toBe(false);
    expect(isMessageMediaKey(7)).toBe(false);
  });
});

describe("межа на файли однієї людини", () => {
  it("існує й не нульова: файл без надсилання лишається в сховищі", () => {
    expect(MESSAGE_MEDIA_PER_USER).toBeGreaterThan(0);
  });
});

describe("формат фото", () => {
  it("сервер і форма приймають один перелік", () => {
    expect(MEDIA_IMAGE_TYPES).toContain("image/png");
    // SVG — документ зі скриптами, а не фото: показувати його не можна.
    expect(MEDIA_IMAGE_TYPES).not.toContain("image/svg+xml");
  });
});

describe("що можна надіслати", () => {
  it("фото без тексту — теж повідомлення, а порожнє поле без фото — ні", () => {
    expect(isSendableMessage("", true)).toBe(true);
    expect(isSendableMessage("   ", false)).toBe(false);
    expect(isSendableMessage("привіт", false)).toBe(true);
  });
});
