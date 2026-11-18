import { describe, expect, it } from "vitest";
import { pageHint, pageTemplateIcon, publicPageAuthor, visibilityLabel } from "./pages-view";

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
