/**
 * Роутер переписки: **фото має власні адреси, а не підміняє чужі**.
 *
 * Перевіряємо три речі. Перше — завантаження і сам файл живуть під своїми
 * адресами в одному домені, тож роутер віддає їх саме сюди, а не сусідньому
 * модулю. Друге — ключ приходить з адреси цілком (у ньому є слеші), тому
 * битий percent-encoding має дати `400`, а не мовчки піти в сховище. Третє —
 * не-повідомний шлях лишається **не нашим** (`null`), щоб роутер пішов далі.
 *
 * @module api-dev/src/routes/messages.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = {
  handleMessages: vi.fn(),
  handleMessageThread: vi.fn(),
  handleMessageSend: vi.fn(),
  handleMessageRead: vi.fn(),
  handleMessageBadge: vi.fn(),
  handleMessageCompose: vi.fn(),
  handleMessageDraft: vi.fn(),
  handleMessageDelete: vi.fn(),
  handleMessageClear: vi.fn(),
  handleMessageMediaUpload: vi.fn(),
  handleMessageMediaFile: vi.fn(),
};

vi.mock("../controllers/messages.controller", () => handlers);
vi.mock("../controllers/message-media.controller", () => ({
  handleMessageMediaUpload: handlers.handleMessageMediaUpload,
  handleMessageMediaFile: handlers.handleMessageMediaFile,
}));

const { matchMessagesRoute } = await import("./messages");

const ENV = {} as Env;
const request = (method = "GET", path = "/api/messages"): Request =>
  new Request(`https://api.test${path}`, { method });

/** Контролери відповідають міткою — важлива лише адреса, за якою вони викликались. */
function answersWithMarker(marker: string): void {
  for (const handler of Object.values(handlers)) {
    handler.mockReturnValue(new Response(marker));
  }
}

describe("адреси фото", () => {
  it("завантаження йде на POST і саме сюди", async () => {
    answersWithMarker("upload");
    const req = request("POST", "/api/messages/media");

    const response = await matchMessagesRoute(req, ENV, "/api/messages/media");

    expect(await (response as Response).text()).toBe("upload");
    expect(handlers.handleMessageMediaUpload).toHaveBeenCalledWith(req, ENV);
  });

  it("GET на адресу завантаження — не завантаження", async () => {
    answersWithMarker("marker");

    await matchMessagesRoute(request("GET"), ENV, "/api/messages/media");

    expect(handlers.handleMessageMediaUpload).not.toHaveBeenCalled();
  });

  it("ключ приходить розкодованим: слеші всередині номера зберігаються", async () => {
    answersWithMarker("file");
    await matchMessagesRoute(request("GET"), ENV, "/api/messages/media/msg/777/abc%2Fdef.png");

    expect(handlers.handleMessageMediaFile).toHaveBeenCalledWith(ENV, "msg/777/abc/def.png");
  });

  it("битий ключ не йде в сховище, а відсікається як 400", async () => {
    const response = await matchMessagesRoute(request("GET"), ENV, "/api/messages/media/%E0%A4%A");

    expect((response as Response).status).toBe(400);
    expect(handlers.handleMessageMediaFile).not.toHaveBeenCalled();
  });
});

describe("сусідні адреси не зачепилися", () => {
  it("список, стрічка й лічильник лишаються там, де були", async () => {
    answersWithMarker("marker");

    await matchMessagesRoute(request(), ENV, "/api/messages");
    await matchMessagesRoute(request(), ENV, "/api/messages/thread");
    await matchMessagesRoute(request(), ENV, "/api/messages/badge");

    expect(handlers.handleMessages).toHaveBeenCalled();
    expect(handlers.handleMessageThread).toHaveBeenCalled();
    expect(handlers.handleMessageBadge).toHaveBeenCalled();
  });

  it("чужий шлях лишається сусідньому модулю", async () => {
    answersWithMarker("marker");

    expect(matchMessagesRoute(request(), ENV, "/api/notes")).toBeNull();
  });
});
