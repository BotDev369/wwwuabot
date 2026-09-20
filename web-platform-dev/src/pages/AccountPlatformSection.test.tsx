/**
 * Розділ «Платформа» — сторож того, що все про себе стоїть **в одній** картці.
 *
 * Раніше тут були дві: «Ім'я на платформі» й «Дані акаунта». Кожна окремо
 * виглядала правильно, а разом вони ділили один факт навпіл — людина читала
 * «ось ім'я» і «ось іще щось про мене» там, де йдеться про те саме. Тест тримає
 * три речі, які ламаються мовчки: кількість карток (друга завелась би
 * поверненням `plain`), заголовок (без нього картка знову безіменна) і те, що
 * дані акаунта нікуди не зникли разом із другою карткою.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { UserProfileData } from "@wwwuabot/shared";
import { AccountPlatformSection } from "./AccountPlatformSection";

const USER: UserProfileData = {
  id: 42,
  platformUsername: "karas",
  role: "user",
  tariff: "free",
  status: "active",
};

const render = (user: UserProfileData = USER): string =>
  renderToStaticMarkup(<AccountPlatformSection user={user} onChangeUsername={async () => null} />);

describe("AccountPlatformSection", () => {
  it("тримає ім'я й дані акаунта в одній картці", () => {
    const html = render();

    expect(html.match(/class="wb-profile"/g)).toHaveLength(1);
    expect(html).toContain("Дані на платформі");
    // Обидві половини — в тій самій картці: ім'я (`#karas`) і поля акаунта.
    expect(html).toContain("#karas");
    expect(html).toContain("Роль");
    expect(html).toContain("Тариф");
    expect(html.indexOf("wb-handle-head")).toBeLessThan(html.indexOf("wb-profile-fields"));
  });

  it("не дає підспискам власних карток", () => {
    const html = render();

    // `plain` у блоці імені: картку дає розділ, тож другої рамки не бути.
    expect(html).not.toContain("wb-profile--handle");
    expect(html).not.toContain("Ім'я на платформі</h3>");
    // Заголовок у картці рівно один — інакше вона знову ділиться навпіл.
    expect(html.match(/class="wb-profile-title"/g)).toHaveLength(1);
  });

  it("каже про фото, лише коли його немає", () => {
    expect(render()).toContain("Своє фото можна буде додати");
    expect(render({ ...USER, photoUrl: "https://cdn.example/photo.jpg" })).not.toContain(
      "Своє фото можна буде додати",
    );
  });
});
