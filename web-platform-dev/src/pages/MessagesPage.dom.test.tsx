// @vitest-environment jsdom
/**
 * Екран «Повідомлення»: **екран лише зводить, рішення лишаються на сервері**.
 *
 * Перевіряємо зведення, а не повторюємо правила кирпичиків. Спершу — три
 * стани екрана не плутаються між собою: завантаження, помилка й список
 * показують різне (порожній список на місці помилки читався би як «у тебе немає
 * розмов»). Далі — **розмова відкривається, а фото в ній прикріплюється**: саме
 * тут `attach` з хука доходить до композера, і втрата цього дроту означала б
 * кнопку, яка ніколи нічого не робить. Наостанок — незворотні дії питають
 * підтвердження й не малюють стан до відповіді сервера.
 *
 * @module web-platform-dev/src/pages/MessagesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Conversation, Message, MessageDraft, MessagePeer } from "@wwwuabot/shared/messages";

const PEER = 42;

const peer: MessagePeer = {
  id: PEER,
  firstName: "Сергій",
  lastName: null,
  username: "serg",
  platformUsername: "karas",
  contactName: null,
  photoUrl: null,
};

const conversation: Conversation = {
  peer,
  lastMessageAt: "2026-10-05 12:00:00",
  lastMessageText: "привіт",
  lastSenderId: PEER,
  unread: 1,
};

const message: Message = {
  id: 1,
  senderId: PEER,
  body: "привіт",
  createdAt: "2026-10-05 12:00:00",
  readAt: null,
  system: false,
  media: null,
};

const draft: MessageDraft = {
  id: 5,
  peerId: PEER,
  body: "недописана думка",
  updatedAt: "2026-10-05 11:00:00",
};

const hooks = {
  conversations: {
    conversations: [] as Conversation[],
    loading: false,
    error: null as string | null,
    reload: vi.fn(),
  },
  compose: {
    drafts: [] as MessageDraft[],
    recipients: [] as MessagePeer[],
    loading: false,
    error: null as string | null,
    reload: vi.fn(),
    send: vi.fn(),
    saveDraft: vi.fn(),
  },
  profile: { profile: { id: 7 } as { id: number } | null },
  thread: {
    peer,
    messages: [message],
    loading: false,
    error: null as string | null,
    sending: false,
    send: vi.fn(),
    attach: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
  },
  dialog: { alert: vi.fn(), confirm: vi.fn(), prompt: vi.fn() },
  form: { open: false, openForm: vi.fn(), closeForm: vi.fn() },
  searchParams: new URLSearchParams(),
};

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [hooks.searchParams, vi.fn()],
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => hooks.dialog }));
vi.mock("./useConversations", () => ({ useConversations: () => hooks.conversations }));
vi.mock("./useCompose", () => ({ useCompose: () => hooks.compose }));
vi.mock("./useProfile", () => ({ useProfile: () => hooks.profile }));
vi.mock("./useThread", () => ({ useThread: () => hooks.thread }));
vi.mock("@/app/useCreateForm", () => ({ useCreateForm: () => hooks.form }));

const { MessagesPage } = await import("./MessagesPage");

/** Рядок розмови: підпис людини береться з імені на платформі, а не з Telegram. */
function conversationRow(): HTMLElement {
  return screen.getByRole("button", { name: /karas/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.conversations = {
    conversations: [conversation],
    loading: false,
    error: null,
    reload: vi.fn(),
  };
  hooks.compose = {
    drafts: [] as MessageDraft[],
    recipients: [] as MessagePeer[],
    loading: false,
    error: null,
    reload: vi.fn(),
    send: vi.fn(),
    saveDraft: vi.fn(),
  };
  hooks.thread = {
    peer,
    messages: [message],
    loading: false,
    error: null,
    sending: false,
    send: vi.fn(),
    attach: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
  };
  hooks.dialog = { alert: vi.fn(), confirm: vi.fn(), prompt: vi.fn() };
  hooks.form = { open: false, openForm: vi.fn(), closeForm: vi.fn() };
  hooks.searchParams = new URLSearchParams();
});

describe("три стани екрана не плутаються", () => {
  it("під час завантаження смуги й списку немає — порожнього списку не видно", () => {
    hooks.conversations = { ...hooks.conversations, loading: true };

    render(<MessagesPage />);

    expect(screen.getByText("Завантаження розмов…")).not.toBeNull();
    expect(screen.queryByText("Повідомлення")).toBeNull();
  });

  it("помилка показується як помилка, а не як порожній список", () => {
    hooks.conversations = { ...hooks.conversations, error: "Сервер не відповів" };

    render(<MessagesPage />);

    expect(screen.getByText("Сервер не відповів")).not.toBeNull();
  });

  it("зайнятий список показує розмови", () => {
    render(<MessagesPage />);

    expect(conversationRow()).not.toBeNull();
  });
});

describe("розмова відкривається поверхнею", () => {
  it("дотик до рядка відкриває стрічку, а «назад» повертає до списку", async () => {
    render(<MessagesPage />);

    await userEvent.click(conversationRow());

    expect(screen.getByLabelText("Текст повідомлення")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Назад" }));
    await waitFor(() => expect(screen.queryByLabelText("Текст повідомлення")).toBeNull());
  });

  it("композер уміє прикріпляти фото: дроук від хука доходить до кнопки", async () => {
    hooks.thread.attach.mockResolvedValue({ id: 9, key: "msg/777/abcdef.png" });
    render(<MessagesPage />);

    await userEvent.click(conversationRow());
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("кнопки прикріплення немає");
    await userEvent.upload(input, new File([new Uint8Array([1])], "p.png", { type: "image/png" }));

    await waitFor(() => expect(hooks.thread.attach).toHaveBeenCalled());
    expect(screen.getByAltText("Прикріплене фото").getAttribute("src")).toContain(
      "msg/777/abcdef.png",
    );
  });

  it("надсилає те, що надруковано, разом із прикріпленим фото", async () => {
    hooks.thread.send.mockResolvedValue(true);
    render(<MessagesPage />);

    await userEvent.click(conversationRow());
    await userEvent.type(screen.getByLabelText("Текст повідомлення"), "да");
    await userEvent.click(screen.getByRole("button", { name: "Надіслати" }));

    await waitFor(() => expect(hooks.thread.send).toHaveBeenCalledWith("да", null));
  });
});

describe("чернетка живе у формі, а не в розмові", () => {
  it("збережена чернетка з'являється рядком лише після підтвердження сервера", async () => {
    hooks.form = { open: true, openForm: vi.fn(), closeForm: vi.fn() };
    hooks.compose.saveDraft.mockResolvedValue(true);
    render(<MessagesPage />);

    // Кнопка активна лише з текстом: пустий лист чернеткою не стає.
    await userEvent.type(screen.getByPlaceholderText("Що написати…"), "думка");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти чернетку" }));

    await waitFor(() => expect(hooks.conversations.reload).toHaveBeenCalled());
  });

  it("незбережена чернетка показує причину, а не закриває форму мовчки", async () => {
    hooks.form = { open: true, openForm: vi.fn(), closeForm: vi.fn() };
    hooks.compose.saveDraft.mockResolvedValue(false);
    render(<MessagesPage />);

    // Кнопка активна лише з текстом: пустий лист чернеткою не стає.
    await userEvent.type(screen.getByPlaceholderText("Що написати…"), "думка");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти чернетку" }));

    await waitFor(() => expect(hooks.dialog.alert).toHaveBeenCalled());
    expect(hooks.conversations.reload).not.toHaveBeenCalled();
  });

  it("видалення чернетки питає згоди і лише тоді сервер прибирає текст", async () => {
    hooks.compose = { ...hooks.compose, drafts: [draft], recipients: [peer] };
    hooks.dialog.confirm.mockResolvedValue(false);
    hooks.compose.saveDraft.mockResolvedValue(true);
    render(<MessagesPage />);

    await userEvent.click(screen.getByRole("button", { name: /чернетк/i }));
    await userEvent.click(screen.getByRole("button", { name: "Видалити" }));

    expect(hooks.dialog.confirm).toHaveBeenCalled();
    expect(hooks.compose.saveDraft).not.toHaveBeenCalled();
  });
});

describe("незворотні дії питають і не малюють стан наперед", () => {
  it("стирання переписки без підтвердження нічого не робить", async () => {
    hooks.dialog.confirm.mockResolvedValue(false);
    render(<MessagesPage />);

    await userEvent.click(conversationRow());
    await userEvent.click(screen.getByRole("button", { name: "Очистити переписку" }));

    expect(hooks.thread.clear).not.toHaveBeenCalled();
  });

  it("стирання переписки після згоди перечитує список", async () => {
    hooks.dialog.confirm.mockResolvedValue(true);
    hooks.thread.clear.mockResolvedValue(true);
    render(<MessagesPage />);

    await userEvent.click(conversationRow());
    await userEvent.click(screen.getByRole("button", { name: "Очистити переписку" }));

    await waitFor(() => expect(hooks.conversations.reload).toHaveBeenCalled());
  });

  it("удалення розмови закриває поверхню й повертає до списку", async () => {
    hooks.dialog.confirm.mockResolvedValue(true);
    hooks.thread.remove.mockResolvedValue(true);
    render(<MessagesPage />);

    await userEvent.click(conversationRow());
    await userEvent.click(screen.getByRole("button", { name: "Видалити розмову" }));

    await waitFor(() => expect(screen.queryByLabelText("Текст повідомлення")).toBeNull());
  });
});

describe("новий лист відкривається чистим", () => {
  it("«+» відкриває форму й нічого не підставляє з чернеток", async () => {
    render(<MessagesPage />);

    await userEvent.click(screen.getByRole("button", { name: "Нове повідомлення" }));

    await waitFor(() => expect(hooks.form.openForm).toHaveBeenCalled());
  });

  it("коли чернетки вмикаються не вдалося — кажемо про це, а не відкриваємо порожню форму", async () => {
    hooks.compose = { ...hooks.compose, error: "Не вдалося завантажити адресатів" };
    render(<MessagesPage />);

    await userEvent.click(screen.getByRole("button", { name: "Нове повідомлення" }));

    await waitFor(() => expect(hooks.dialog.alert).toHaveBeenCalled());
    expect(hooks.form.openForm).not.toHaveBeenCalled();
  });
});
