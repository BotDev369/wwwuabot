// @vitest-environment jsdom
/**
 * Профіль: три подання, розмір аватара — класом.
 * @module packages/ui/src/blocks/UserProfileBlock.dom.test
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { UserProfileBlock } from "./UserProfileBlock";

function block(
  props: Record<string, unknown>,
  user?: Record<string, unknown>,
): BlockComponentProps {
  return {
    block: { id: "b1", type: "user-profile", order: 0, props },
    zone: "main",
    context: { user } as unknown as BlockComponentProps["context"],
  };
}

const USER = { id: 42, firstName: "Олена", lastName: "Коваль", username: "olena" };

describe("UserProfileBlock", () => {
  it("без людини показує порожній стан", () => {
    render(<UserProfileBlock {...block({})} />);

    expect(screen.getByText("Користувач не авторизований")).toBeTruthy();
  });

  it("картка показує ім'я, нік і великий аватар", () => {
    const { container } = render(<UserProfileBlock {...block({}, USER)} />);
    const card = container.querySelector(".wb-block-user-profile") as HTMLElement;

    expect(card.className).toContain("--card");
    expect(screen.getByText("Олена Коваль")).toBeTruthy();
    expect(screen.getByText("@olena")).toBeTruthy();
    expect(container.querySelector(".wb-block-user-profile__avatar--lg")).toBeTruthy();
    expect(card.getAttribute("style")).toBeNull();
  });

  it("компактний рядок — малий аватар і без ID", () => {
    const { container } = render(
      <UserProfileBlock {...block({ layout: "compact", showId: true }, USER)} />,
    );

    expect(container.querySelector(".wb-block-user-profile__avatar--sm")).toBeTruthy();
    expect(screen.queryByText(/ID: 42/)).toBeNull();
  });

  it("рядок показує ID, коли його попросили", () => {
    const { container } = render(
      <UserProfileBlock {...block({ layout: "inline", showId: true }, USER)} />,
    );

    expect(container.querySelector(".wb-block-user-profile__avatar--md")).toBeTruthy();
    expect(screen.getByText("ID: 42")).toBeTruthy();
  });

  it("поля можна вимкнути по одному", () => {
    render(<UserProfileBlock {...block({ showAvatar: false, showUsername: false }, USER)} />);

    expect(screen.getByText("Олена Коваль")).toBeTruthy();
    expect(screen.queryByText("@olena")).toBeNull();
    expect(document.querySelector(".wb-block-user-profile__avatar")).toBeNull();
  });
});
