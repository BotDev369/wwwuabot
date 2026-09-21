/**
 * Сторож картки людини в Просторі.
 *
 * Найважливіше тут — не вигляд, а **чого в картці не буває**. Картка показує
 * профіль чужій людині, тож будь-яке поле, яке вона «просто відрендерить», стає
 * витоком. Тест тримає саме це: рендер іде **полем за полем**, а не дампом
 * того, що прийшло.
 *
 * @module @wwwuabot/shared/components/space/PublicUserCard.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicUserCard } from "./PublicUserCard";
import type { PublicProfile } from "../../user/public-profile";

const render = (profile: PublicProfile, full = false): string =>
  renderToStaticMarkup(<PublicUserCard profile={profile} full={full} />);

describe("картка людини в Просторі", () => {
  it("показує ім'я з `#`, про себе й дані акаунта", () => {
    const html = render({
      id: 7,
      platformUsername: "karas",
      about: "Люблю гори",
      role: "user",
      tariff: "pro",
    });

    expect(html).toContain("#karas");
    expect(html).toContain("Люблю гори");
    expect(html).toContain("user · pro");
  });

  it("⛔ не показує нічого з того, чого в типі немає", () => {
    // Навіть якби сервер помилково доложив Telegram-поля, картка їх не
    // надрукує: вона бере рівно ті поля, які знає, а не перебирає об'єкт.
    const smuggled = {
      id: 7,
      platformUsername: "karas",
      username: "sergiy",
      first_name: "Сергій",
      photo_url: "https://t.me/telegram-avatar.jpg",
      telegram_json: '{"id":7}',
    } as unknown as PublicProfile;

    const html = render(smuggled);
    expect(html).not.toContain("sergiy");
    expect(html).not.toContain("Сергій");
    expect(html).not.toContain("telegram-avatar");
    expect(html).not.toContain("telegram_json");
  });

  it("без імені каже, що його приховано, а не мовчить", () => {
    // Порожнє місце читалось би як поламана картка, а не як вибір людини.
    // Розмітка екранує апостроф (`&#x27;`), тож перевіряємо слово, а не фразу.
    expect(render({ id: 7, about: "Привіт" })).toContain("приховано");
  });

  it("порожній профіль називає себе порожнім", () => {
    expect(render({ id: 7 })).toContain("Без публічних даних");
  });

  it("фото замінює літеру, а його відсутність — не ламає", () => {
    const withPhoto = render({ id: 7, platformUsername: "karas", photoUrl: "https://c/x.jpg" });
    expect(withPhoto).toContain('<img src="https://c/x.jpg"');
    expect(withPhoto).not.toContain("wb-person-initial");
    expect(render({ id: 7, platformUsername: "karas" })).toContain("wb-person-initial");
  });

  it("у стрічці картка — кнопка, на сторінці людини — картка", () => {
    // Кнопка, яка нікуди не веде, обіцяла б перехід; картка, за якою стоїть
    // сторінка, мусить бути на всю ширину й ловити дотик.
    const tappable = renderToStaticMarkup(
      <PublicUserCard profile={{ id: 7 }} onSelect={() => {}} />,
    );
    expect(tappable).toContain("<button");
    expect(tappable).toContain("wb-person--tappable");
    expect(render({ id: 7 })).not.toContain("<button");
  });
});
