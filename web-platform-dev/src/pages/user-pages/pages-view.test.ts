import { describe, expect, it } from "vitest";
import type { PageStaff } from "@wwwuabot/shared/pages";
import {
  accessHint,
  pageHint,
  pageTemplateIcon,
  publicPageAuthor,
  staffLabel,
  visibilityLabel,
} from "./pages-view";

describe("подання сторінки", () => {
  it("видимість — одне слово, і воно те саме в списку й на екрані", () => {
    expect(visibilityLabel(true)).toBe("Публічно");
    expect(visibilityLabel(false)).toBe("Приватно");
  });

  it("рядок списку каже і видимість, і адресу: з назви цього не видно", () => {
    expect(pageHint({ isPublic: false, slug: "osinnii-iarmarok" })).toBe(
      "Приватно · /osinnii-iarmarok",
    );
  });

  it("автора підписують `#`, а не `@`: `@` належить Telegram", () => {
    expect(publicPageAuthor({ author: { id: 1, name: "oksana", photoUrl: null } })).toBe("#oksana");
  });

  it("без імені картка не мовчить — інакше порожнє місце читалось би як зламаний екран", () => {
    expect(publicPageAuthor({ author: { id: 1, name: null, photoUrl: null } })).toBe("Без імені");
  });

  it("кожен шаблон має свою іконку — вони й розрізняють сторінки в списку", () => {
    expect(pageTemplateIcon("card")).toBe("card");
    expect(pageTemplateIcon("event")).toBe("calendar");
    expect(pageTemplateIcon("shop")).toBe("shop");
  });
});

describe("доступ до сторінки", () => {
  const OWNER: PageStaff = { id: 372567448, name: "#karas", role: "owner" };
  const ADMIN: PageStaff = { id: 1049272067, name: "#galyashop", role: "admin" };

  it("власник і адміни читаються одним рядком", () => {
    expect(staffLabel({ staff: [OWNER, ADMIN] })).toBe("Власник: #karas · Адміни: #galyashop");
  });

  it("без адмінів рядок не обіцяє їх — і не мовчить про власника", () => {
    expect(staffLabel({ staff: [OWNER] })).toBe("Власник: #karas");
  });

  it("людину без імені називають номером: доступ роздають саме за ним", () => {
    expect(staffLabel({ staff: [{ id: 42, name: null, role: "admin" }] })).toBe(
      "Власник: невідомо · Адміни: ID 42",
    );
  });

  it("адмін бачить, що доступом керує власник, а не він", () => {
    expect(accessHint({ role: "admin" })).toContain("керує власник");
    expect(accessHint({ role: "owner" })).toContain("Ви власник");
  });
});
