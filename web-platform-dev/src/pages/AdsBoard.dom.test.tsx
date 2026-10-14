// @vitest-environment jsdom
/**
 * Дошка оголошень як список: **чотири стани й дії власника**.
 *
 * Тут ламається мовчки: досить не показати причину помилки — і дошка виглядає
 * просто порожньою; досить не сказати на порожньому екрані, де створити, — і
 * людині нікуди натиснути; досить видалити без питання — і написане зникає
 * назавжди від одного випадкового дотику.
 *
 * Рядок (`AdCard`) і смуга керування (`AdsToolbar`) тут замінені заглушками:
 * їхній вигляд — окремі кирпичики, а цей файл питає про те, як дошка ними
 * керує.
 *
 * @module web-platform-dev/src/pages/AdsBoard.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ad } from "@wwwuabot/shared/ads";
import type { PublicAd } from "./ads-list";

const dialog = { confirm: vi.fn(), alert: vi.fn() };

vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));
vi.mock("./AdCard", () => ({
  AdCard({
    ad,
    onEdit,
    onToggle,
    onDelete,
  }: {
    ad: Ad;
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
  }) {
    return (
      <div>
        <span>{ad.title}</span>
        <button onClick={onEdit}>edit</button>
        <button onClick={onToggle}>toggle</button>
        <button onClick={onDelete}>delete</button>
      </div>
    );
  },
}));
vi.mock("./AdsToolbar", () => ({
  AdsToolbar({
    onChange,
    onCompose,
  }: {
    onChange: (patch: { query: string }) => void;
    onCompose: () => void;
  }) {
    return (
      <>
        <button onClick={onCompose}>compose</button>
        <button onClick={() => onChange({ query: "zzz" })}>narrow</button>
      </>
    );
  },
}));

const { AdsBoard } = await import("./AdsBoard");

type BoardProps = Parameters<typeof AdsBoard>[0];

const publicAd = (id: number, title = `#${id}`, isActive = true): PublicAd => ({
  ad: {
    id,
    ownerId: 1,
    kind: "sell",
    title,
    body: "",
    price: "",
    place: "",
    isActive,
    createdAt: "",
    updatedAt: "",
  },
  mine: true,
});

function renderBoard(overrides: Partial<BoardProps> = {}): BoardProps {
  const props: BoardProps = {
    items: [],
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onCompose: vi.fn(),
    onToggle: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<AdsBoard {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  dialog.confirm.mockResolvedValue(true);
  dialog.alert.mockResolvedValue(undefined);
});

describe("стани дошки", () => {
  it("завантаження не прикидається порожньою дошкою", () => {
    renderBoard({ loading: true });

    expect(screen.getByText(/Завантаження/)).toBeTruthy();
  });

  it("помилка називає причину й дає спробувати ще", async () => {
    const props = renderBoard({ error: "Немає доступу" });

    expect(screen.getByText("Немає доступу")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));

    expect(props.onRetry).toHaveBeenCalled();
  });

  it("порожня дошка каже, де створити, і сама веде туди", async () => {
    const props = renderBoard();

    expect(screen.getByText(/Тут поки нічого немає/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Створити оголошення/ }));

    expect(props.onCompose).toHaveBeenCalled();
  });
});

describe("список", () => {
  it("показує те, що дав список, і дає дії власника", async () => {
    const props = renderBoard({ items: [publicAd(1, "Телевізор")] });

    expect(screen.getByText("Телевізор")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "edit" }));
    expect(props.onCompose).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(props.onToggle).toHaveBeenCalled();
  });

  it("створення живе в смузі керування, коли список непорожній", async () => {
    const props = renderBoard({ items: [publicAd(1)] });

    await userEvent.click(screen.getByRole("button", { name: "compose" }));

    expect(props.onCompose).toHaveBeenCalled();
  });

  it("звужений до нуля список каже про це й повертає його", async () => {
    renderBoard({ items: [publicAd(1)] });

    await userEvent.click(screen.getByRole("button", { name: "narrow" }));

    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
    expect(screen.queryByText("#1")).toBeNull();
  });
});

describe("видалення питає", () => {
  it("підтвердження прибирає оголошення", async () => {
    const props = renderBoard({ items: [publicAd(7, "Кава")] });

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(dialog.confirm).toHaveBeenCalled();
    expect(props.onRemove).toHaveBeenCalledWith(7);
  });

  it("відмова нічого не прибирає", async () => {
    dialog.confirm.mockResolvedValue(false);
    const props = renderBoard({ items: [publicAd(7)] });

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it("збій видалення називає причину", async () => {
    const onRemove = vi.fn().mockRejectedValue(new Error("Не ваше"));
    renderBoard({ items: [publicAd(7)], onRemove });

    await userEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(dialog.alert).toHaveBeenCalledWith("Не ваше", { tone: "danger" });
  });
});
