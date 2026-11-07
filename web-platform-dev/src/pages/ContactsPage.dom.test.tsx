// @vitest-environment jsdom
/**
 * «Контакти»: слова з рядка `scenarios`, порожній екран із виходом і діалоги,
 * які не мають зникати мовчки.
 *
 * @module web-platform-dev/src/pages/ContactsPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Contact } from "@wwwuabot/shared/contacts";

const texts = vi.hoisted(() => ({
  "contacts.title": "Контакти",
  "contacts.add": "Додати контакт",
  "contacts.add.prompt": "Як звати людину, якій ви надсилаєте посилання?",
  "contacts.add.promptTitle": "Додати контакт",
  "contacts.add.placeholder": "Ім'я контакту",
  "contacts.add.emptyName": "Ім'я не може бути порожнім",
  "contacts.add.failed": "Не вдалося додати контакт",
  "contacts.save.failed": "Не вдалося зберегти контакт",
  "contacts.link.failed": "Не вдалося скласти лінк",
  "contacts.delete.failed": "Не вдалося прибрати контакт",
  "contacts.delete.confirm": "Прибрати контакт «{name}»?",
  "contacts.delete.title": "Видалення",
  "contacts.delete.confirmText": "Прибрати",
  "contacts.copy.action": "Скопіювати",
  "contacts.copy.failed": "{what} не вдалося — візьміть посилання з розкритого контакту.",
  "contacts.copy.noLink": "Бот ще не знає свого імені — посилання не склалося.",
  "contacts.copy.title": "Скопіюйте вручну",
  "contacts.error.title": "Помилка",
  "contacts.loading": "Завантаження контактів…",
  "contacts.empty.title": "Ще немає жодного контакту.",
  "contacts.empty.hint": "Натисніть «+» угорі — посилання скопіюється саме.",
  "contacts.search.empty": "Нічого не знайдено за цим запитом.",
  "contacts.search.reset": "Скинути пошук і фільтри",
}));

const dialog = vi.hoisted(() => ({ alert: vi.fn(), confirm: vi.fn(), prompt: vi.fn() }));
const chrome = vi.hoisted(() => ({ title: "" }));
const form = vi.hoisted(() => ({ open: false, openForm: vi.fn(), closeForm: vi.fn() }));
const clip = vi.hoisted(() => ({ writeText: vi.fn() }));
const filter = vi.hoisted(() => ({ visible: [] as Contact[], noGroups: false }));
const state = vi.hoisted(() => ({
  contacts: [] as Contact[],
  loading: false,
  error: null as string | null,
  create: vi.fn(),
  update: vi.fn(),
  makeLink: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@wwwuabot/ui/nav", () => ({
  useScreenChrome: ({ title }: { title: string }) => {
    chrome.title = title;
  },
}));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));
vi.mock("@/app/useCreateForm", () => ({ useCreateForm: () => form }));
vi.mock("./useContacts", () => ({ useContacts: () => state }));
vi.mock("./screen-texts/useScreenTexts", () => ({
  useScreenTexts: () => ({ texts, ready: true }),
}));
vi.mock("@wwwuabot/ui/contacts", () => ({
  DEFAULT_CONTACTS_VIEW: {},
  filterContacts: () => filter.visible,
  buildContactGroups: (contacts: Contact[]) =>
    filter.noGroups || contacts.length === 0 ? [] : [{ title: "g", contacts }],
  collectContactTags: () => [],
  foundContactTags: () => [],
  ContactTotals: () => <div data-testid="totals" />,
  ContactsToolbar: () => <div data-testid="toolbar" />,
  ContactSheet: ({ contact }: { contact: Contact }) => (
    <div data-testid="sheet">{contact.name}</div>
  ),
  ContactList: ({
    groups,
    onMakeLink,
    onDelete,
  }: {
    groups: { contacts: Contact[] }[];
    onMakeLink: (contact: Contact) => void;
    onDelete: (contact: Contact) => void;
  }) => (
    <div data-testid="list">
      {groups[0]?.contacts.map((contact) => (
        <div key={contact.id}>
          <span>{contact.name}</span>
          <button type="button" onClick={() => onMakeLink(contact)}>
            link
          </button>
          <button type="button" onClick={() => onDelete(contact)}>
            delete
          </button>
        </div>
      ))}
    </div>
  ),
}));

const { ContactsPage } = await import("./ContactsPage");

const person = (overrides: Partial<Contact> = {}): Contact =>
  ({
    id: 1,
    name: "Олена",
    tags: [],
    notes: "",
    deepLink: "https://t.me/bot?start=abc",
    ...overrides,
  }) as Contact;

beforeEach(() => {
  vi.clearAllMocks();
  state.contacts = [];
  state.loading = false;
  state.error = null;
  state.create = vi.fn();
  state.update = vi.fn();
  state.makeLink = vi.fn(async () => person());
  state.remove = vi.fn(async () => undefined);
  filter.visible = [];
  filter.noGroups = false;
  form.open = false;
  dialog.alert.mockResolvedValue(undefined);
  dialog.confirm.mockResolvedValue(false);
  dialog.prompt.mockResolvedValue(null);
  clip.writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: clip, configurable: true });
});

describe("стани екрана", () => {
  it("бере заголовок із рядка й каже, що контактів ще немає", () => {
    render(<ContactsPage />);

    expect(chrome.title).toBe("Контакти");
    expect(screen.getByText("Ще немає жодного контакту.")).toBeTruthy();
    expect(screen.getByText(/Натисніть «\+» угорі/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Додати контакт" })).toBeTruthy();
  });

  it("завантаження й помилка не прикидаються порожнім списком", () => {
    state.loading = true;
    const view = render(<ContactsPage />);
    expect(screen.getByText("Завантаження контактів…")).toBeTruthy();
    view.unmount();

    state.loading = false;
    state.error = "Немає доступу";
    render(<ContactsPage />);
    expect(screen.getByText("Немає доступу")).toBeTruthy();
    expect(screen.queryByText("Ще немає жодного контакту.")).toBeNull();
  });

  it("пошук без збігів дає скинути фільтри", () => {
    state.contacts = [person()];
    filter.visible = [];
    filter.noGroups = true;
    render(<ContactsPage />);

    expect(screen.getByText("Нічого не знайдено за цим запитом.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Скинути пошук/ })).toBeTruthy();
  });
});

describe("дії з контактом", () => {
  it("«+» питає ім'я, складає лінк і відкриває форму", async () => {
    state.contacts = [person()];
    filter.visible = state.contacts;
    state.create = vi.fn(async () => person());
    dialog.prompt.mockResolvedValue("  Олена  ");
    render(<ContactsPage />);

    await userEvent.click(screen.getByRole("button", { name: "Додати контакт" }));

    await waitFor(() =>
      expect(state.create).toHaveBeenCalledWith({ name: "Олена", tags: [], notes: "" }),
    );
    expect(dialog.prompt).toHaveBeenCalledWith(
      "Як звати людину, якій ви надсилаєте посилання?",
      expect.objectContaining({ title: "Додати контакт", placeholder: "Ім'я контакту" }),
    );
    expect(state.makeLink).toHaveBeenCalledWith(1);
    expect(clip.writeText).toHaveBeenCalledWith("https://t.me/bot?start=abc");
    expect(screen.getByTestId("sheet").textContent).toBe("Олена");
  });

  it("невдале складання лінка каже, що робити", async () => {
    state.contacts = [person({ deepLink: null })];
    filter.visible = state.contacts;
    state.makeLink = vi.fn(async () => person({ deepLink: null }));
    render(<ContactsPage />);

    await userEvent.click(screen.getByRole("button", { name: "link" }));

    await waitFor(() =>
      expect(dialog.alert).toHaveBeenCalledWith(
        "Бот ще не знає свого імені — посилання не склалося.",
        { title: "Скопіюйте вручну" },
      ),
    );
  });

  it("видалення питає підтвердження й прибирає лише після згоди", async () => {
    state.contacts = [person()];
    filter.visible = state.contacts;
    render(<ContactsPage />);

    await userEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(dialog.confirm).toHaveBeenCalledWith("Прибрати контакт «Олена»?", {
      title: "Видалення",
      tone: "danger",
      confirmText: "Прибрати",
    });
    expect(state.remove).not.toHaveBeenCalled();

    dialog.confirm.mockResolvedValue(true);
    await userEvent.click(screen.getByRole("button", { name: "delete" }));
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith(1));
  });
});
