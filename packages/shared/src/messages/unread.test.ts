/**
 * Сигнал «непрочитане могло змінитись» — правило, яке ламається мовчки.
 *
 * Бейдж футера опитує сервер: якщо сигнал не дійде, число просто лишиться
 * старим, і жодна помилка не з'явиться — виглядатиме як «бейдж залипає».
 * Якщо сигнал дійде **двічі** або прийде до вже відписаного слухача, поїдуть
 * зайві запити. Обидві помилки тут не видно ні в типах, ні в збірці.
 *
 * @module @wwwuabot/shared/messages/unread.test
 */

import { describe, expect, it } from "vitest";
import { notifyUnreadChanged, onUnreadChanged } from "./unread";

describe("сигнал про непрочитане", () => {
  it("каже всім, хто слухає", () => {
    const heard: string[] = [];
    const offA = onUnreadChanged(() => heard.push("a"));
    const offB = onUnreadChanged(() => heard.push("b"));

    notifyUnreadChanged();
    expect(heard).toEqual(["a", "b"]);

    offA();
    offB();
    heard.length = 0;
    notifyUnreadChanged();
    expect(heard).toEqual([]);
  });

  it("числа не несе: слухач лише просить перерахувати в сервера", () => {
    // Підпис не отримує аргументів навмисно — інакше клієнт почав би зменшувати
    // лічильник собі, а це друге сховище того самого факту.
    const heard: number[] = [];
    const off = onUnreadChanged((...args: number[]) => heard.push(args.length));

    notifyUnreadChanged();
    expect(heard).toEqual([0]);

    off();
  });

  it("відписка під час виклику не пропускає наступного слухача", () => {
    // Ефект у React знімається рівно під час дотику — і обхід `Set`, що
    // змінюється, пропустив би решту слухачів.
    const heard: string[] = [];
    const offFirst = onUnreadChanged(() => {
      heard.push("first");
      offFirst();
    });
    const offSecond = onUnreadChanged(() => heard.push("second"));

    notifyUnreadChanged();
    expect(heard).toEqual(["first", "second"]);

    offSecond();
  });
});
