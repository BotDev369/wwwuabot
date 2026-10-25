// @vitest-environment jsdom
/**
 * Поле вводу належить **одній** розмові.
 *
 * Набраний текст і прикріплене фото живуть у стані композера; без ключа за
 * співрозмовником вони переїжджали б у сусідню розмову — людина бачила б там
 * те, що писала іншій людині.
 *
 * @module @wwwuabot/ui/messages/ThreadSheet.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MessagePeer } from "@wwwuabot/shared/messages";
import { ThreadSheet } from "./ThreadSheet";

const ME = 7;

function peer(id: number, name: string): MessagePeer {
  return {
    id,
    firstName: name,
    lastName: null,
    username: null,
    platformUsername: name.toLowerCase(),
    contactName: null,
    photoUrl: null,
  };
}

const KARAS = peer(42, "Karas");
const MAMI = peer(43, "Mami");

function sheet(who: MessagePeer) {
  return (
    <ThreadSheet
      peer={who}
      meId={ME}
      messages={[]}
      onSend={vi.fn(async () => true)}
      onClear={vi.fn()}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />
  );
}

describe("поле вводу розмови", () => {
  it("набране не переїжджає в іншу розмову", async () => {
    const { rerender } = render(sheet(KARAS));
    const field = screen.getByLabelText("Текст повідомлення") as HTMLInputElement;

    await userEvent.type(field, "Кукурудза");
    expect(field.value).toBe("Кукурудза");

    rerender(sheet(MAMI));

    expect((screen.getByLabelText("Текст повідомлення") as HTMLInputElement).value).toBe("");
  });

  it("але те саме поле лишається при звичайному перемальовуванні", async () => {
    const { rerender } = render(sheet(KARAS));
    const field = screen.getByLabelText("Текст повідомлення") as HTMLInputElement;

    await userEvent.type(field, "Кукурудза");
    rerender(sheet(KARAS));

    expect((screen.getByLabelText("Текст повідомлення") as HTMLInputElement).value).toBe(
      "Кукурудза",
    );
  });
});
