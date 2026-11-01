// @vitest-environment jsdom
/**
 * Екран налаштувань бота: стан вебхука, відповідь Telegram і дії з ним.
 *
 * Тест тримає дві речі, які легко зламати мовчки: що екран показує саме те, що
 * віддав API (URL, лічильник, помилку), і що він не пише власних стилів —
 * вигляд живе в `bot-settings.css`, а не в розмітці.
 *
 * @module web-admin-dev/src/pages/bot-settings/BotSettingsPage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
const dialog = vi.hoisted(() => ({ confirm: vi.fn() }));

vi.mock("../../shared/api/client", () => ({
  apiFetch: (...args: unknown[]) => api.fetch(...args),
}));
vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ confirm: dialog.confirm, alert: vi.fn(), prompt: vi.fn() }),
}));
vi.mock("../../layout/PageTopbar", () => ({
  PageTopbar: ({ children }: { children: unknown }) => <div>{children as never}</div>,
}));

const { BotSettingsPage } = await import("./BotSettingsPage");

const WEBHOOK = "/api/bot/webhook-info";
const INFO = "/api/bot/info";

const BOT = { ok: true, result: { id: 777, is_bot: true, first_name: "Probe", username: "probe" } };

/** Відповіді маршрутів: значення або `Error`, який відхилить проміс. */
function serve(routes: Record<string, unknown>) {
  api.fetch.mockImplementation((url: string) => {
    const value = routes[url];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

function okWebhook(url = "https://bot-dev.example.workers.dev/webhook") {
  return { ok: true, result: { url, has_custom_certificate: false, pending_update_count: 3 } };
}

async function mounted(routes: Record<string, unknown>) {
  serve(routes);
  const view = render(<BotSettingsPage />);
  await waitFor(() => expect(screen.queryByText("Завантаження...")).toBeNull());
  return view;
}

describe("BotSettingsPage", () => {
  it("показує завантаження, поки не прийшла відповідь", () => {
    api.fetch.mockImplementation(() => new Promise(() => {}));
    render(<BotSettingsPage />);
    expect(screen.getByText("Завантаження...")).toBeTruthy();
  });

  it("малює бота, вебхук і лічильник оновлень", async () => {
    const { container } = await mounted({ [WEBHOOK]: okWebhook(), [INFO]: BOT });

    expect(screen.getByText("@probe")).toBeTruthy();
    expect(screen.getByText("777")).toBeTruthy();
    expect(screen.getByText("https://bot-dev.example.workers.dev/webhook")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    // Два бейджі «OK»: сам вебхук і відповідь Telegram — тому питаємо картку.
    const webhookCard = [...container.querySelectorAll(".wb-card")].find((card) =>
      card.textContent?.includes("Webhook"),
    );
    expect(webhookCard?.querySelector(".wb-badge")?.textContent).toBe("OK");
    expect(container.querySelectorAll('[class*="bs-"][style]')).toHaveLength(0);
  });

  it("чужу URL показує як помилку, а порожню — як «Не встановлено»", async () => {
    const { unmount } = await mounted({
      [WEBHOOK]: okWebhook("https://elsewhere.example/webhook"),
      [INFO]: BOT,
    });
    expect(screen.getByText("Не правильна URL")).toBeTruthy();
    unmount();

    await mounted({
      [WEBHOOK]: {
        ok: true,
        result: { url: "", has_custom_certificate: false, pending_update_count: 0 },
      },
      [INFO]: BOT,
    });
    expect(screen.getByText("Не налаштовано")).toBeTruthy();
    expect(screen.getByText("Не встановлено")).toBeTruthy();
  });

  it("показує останню помилку Telegram", async () => {
    await mounted({
      [WEBHOOK]: {
        ok: true,
        result: {
          url: "https://bot-dev.example/webhook",
          has_custom_certificate: true,
          pending_update_count: 1,
          last_error_message: "Wrong response from the webhook",
        },
      },
      [INFO]: BOT,
    });

    expect(screen.getByText("Остання помилка:")).toBeTruthy();
    expect(screen.getByText("Wrong response from the webhook")).toBeTruthy();
  });

  it("успішне встановлення показує повідомлення й перечитує вебхук", async () => {
    const { container } = await mounted({
      [WEBHOOK]: okWebhook(),
      [INFO]: BOT,
      "/api/bot/setup-webhook": { success: true, result: { ok: true, description: "set" } },
    });

    fireEvent.click(screen.getByText("Встановити вебхук"));

    expect(await screen.findByText("Вебхук встановлено!")).toBeTruthy();
    // Після перечитування показується свіжий вебхук, а не відповідь на POST.
    expect(container.querySelector(".bs-json")?.textContent).toContain('"pending_update_count": 3');
    // Перше завантаження + перечитування після встановлення.
    expect(api.fetch.mock.calls.filter(([url]) => url === WEBHOOK).length).toBe(2);
    expect(container.querySelector('[class*="bs-"][style]')).toBeNull();
  });

  it("невдале встановлення не вдає успіх", async () => {
    await mounted({
      [WEBHOOK]: okWebhook(),
      [INFO]: BOT,
      "/api/bot/setup-webhook": { success: false, result: { ok: false, description: "nope" } },
    });

    fireEvent.click(screen.getByText("Встановити вебхук"));
    expect(await screen.findByText("Помилка встановлення")).toBeTruthy();
  });

  it("мережева помилка при встановленні стає повідомленням, а не падінням", async () => {
    await mounted({
      [WEBHOOK]: okWebhook(),
      [INFO]: BOT,
      "/api/bot/setup-webhook": new Error("boom"),
    });

    fireEvent.click(screen.getByText("Встановити вебхук"));
    expect(await screen.findByText("Помилка: Error: boom")).toBeTruthy();
  });

  it("видалення без підтвердження нічого не робить", async () => {
    dialog.confirm.mockResolvedValue(false);
    await mounted({ [WEBHOOK]: okWebhook(), [INFO]: BOT });

    fireEvent.click(screen.getByText("Видалити"));
    await waitFor(() => expect(dialog.confirm).toHaveBeenCalledTimes(1));
    expect(api.fetch.mock.calls.some(([url]) => url === "/api/bot/delete-webhook")).toBe(false);
  });

  it("підтверджене видалення очищає URL", async () => {
    dialog.confirm.mockResolvedValue(true);
    await mounted({
      [WEBHOOK]: okWebhook(),
      [INFO]: BOT,
      "/api/bot/delete-webhook": { success: true, result: { ok: true } },
    });
    // Telegram віддає після видалення порожній `result`, тож перечитуємо вже так.
    serve({
      [WEBHOOK]: { ok: true },
      [INFO]: BOT,
      "/api/bot/delete-webhook": { success: true, result: { ok: true } },
    });

    fireEvent.click(screen.getByText("Видалити"));

    expect(await screen.findByText("Вебхук видалено")).toBeTruthy();
    expect(screen.getByText("Не встановлено")).toBeTruthy();
  });

  it("помилка завантаження показується смугою", async () => {
    serve({ [WEBHOOK]: new Error("немає мережі"), [INFO]: BOT });
    render(<BotSettingsPage />);

    expect(await screen.findByText("Помилка: Error: немає мережі")).toBeTruthy();
  });

  it("відповідь Telegram з помилкою позначена як помилка", async () => {
    await mounted({
      [WEBHOOK]: { ok: false, description: "Unauthorized" },
      [INFO]: BOT,
    });

    expect(screen.getByText("Помилка")).toBeTruthy();
    expect(screen.getByText(/"description": "Unauthorized"/)).toBeTruthy();
  });
});
