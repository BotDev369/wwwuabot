/**
 * «МоїКонтакти» — люди, закріплені за вами особистим посиланням.
 *
 * Екран лише **зводить** те, що вже є: картки й схему дає спільний
 * `@wwwuabot/ui/invites`, дані — `useInvites`, а адреса й власник — ця
 * оболонка. Тому тут немає ні розмітки картки, ні правила «хто приєднався»:
 * усе це перевіряється тестами в спільному модулі, незалежно від платформи.
 *
 * **Одна дія й один результат.** Контакт не заводять руками — його запрошують:
 * «Додати контакт» питає ім'я, створює посилання й **одразу кладе його в
 * буфер**, бо це єдине, за чим людина сюди приходить («скопіював — надіслав»).
 * Нижче — «Схема залучених»: те, що з цього вийшло.
 *
 * Самого посилання немає окремим блоком: воно належить **контакту**, і
 * показується в його картці — там, де його шукають, коли треба надіслати лінк
 * ще раз.
 *
 * Шлях власний (`/contacts`), а не `slug` рядка `scenarios`: список збирається
 * з даних людини (таблиця `invites`), а не з `page_data` (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/ContactsPage
 */

import { useEffect, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { sanitizeInviteLabel, type InviteLink } from "@wwwuabot/shared/invites";
import { useDialog } from "@wwwuabot/ui/dialog";
import { InvitesList, InvitesScheme } from "@wwwuabot/ui/invites";
import { useInvites } from "./useInvites";

/** Скільки тримається «Скопійовано» на кнопці. */
const COPIED_MS = 2000;

export function ContactsPage(): ReactElement {
  const { links, loading, error, create, remove } = useInvites();
  const dialog = useDialog();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (copiedId === null) return;
    const timer = setTimeout(() => setCopiedId(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedId]);

  /**
   * Покласти лінк у буфер і позначити картку.
   *
   * Повертає `false`, а не кидає: невдача буфера — не помилка дії, а привід
   * показати посилання текстом, і вирішує це той, хто кликав.
   */
  async function copyToClipboard(link: InviteLink): Promise<boolean> {
    if (!link.deepLink) return false;
    try {
      await navigator.clipboard.writeText(link.deepLink);
      setCopiedId(link.id);
      return true;
    } catch {
      // Буфер обміну закритий — показуємо лінк текстом, щоб його можна було
      // скопіювати руками: мовчазна невдача тут гірша за будь-яке повідомлення.
      return false;
    }
  }

  /**
   * Додавання контакту: ім'я питаємо діалогом (без підпису список
   * перетвориться на стовпчик однакових кодів), а посилання одразу віддаємо
   * в буфер — щоб «додав» і «надіслав» були однією дією, а не двома.
   */
  async function addContact(): Promise<void> {
    const answer = await dialog.prompt("Як звати людину, якій ви надсилаєте посилання?", {
      title: "Додати контакт",
      placeholder: "Ім'я контакту",
      validate: (value) =>
        sanitizeInviteLabel(value) === "" ? "Підпис не може бути порожнім" : null,
    });
    if (answer === null) return;

    try {
      const created = await create(sanitizeInviteLabel(answer));
      if (await copyToClipboard(created)) {
        await dialog.alert(
          "Контакт додано, посилання вже в буфері — надішліть його людині в Telegram. Коли вона приєднається, контакт закріпиться за вами.",
          { title: "Посилання скопійовано" },
        );
      } else {
        await dialog.alert(
          created.deepLink
            ? `Контакт додано, але скопіювати не вдалося. Ось посилання:\n${created.deepLink}`
            : "Контакт додано, але бот ще не знає свого імені — посилання не склалося. Оновіть екран і спробуйте ще раз.",
          { title: "Скопіюйте вручну" },
        );
      }
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося додати контакт", {
        title: "Помилка",
      });
    }
  }

  async function copyLink(link: InviteLink): Promise<void> {
    if (await copyToClipboard(link)) return;
    await dialog.alert(
      link.deepLink
        ? `Скопіювати не вдалося. Ось посилання:\n${link.deepLink}`
        : "Посилання не складено: бот ще не знає свого імені.",
      { title: "Скопіюйте вручну" },
    );
  }

  async function deleteLink(link: InviteLink): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати контакт «${link.label}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await remove(link.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати контакт", {
        title: "Помилка",
      });
    }
  }

  const hasLinks = !loading && !error && links.length > 0;

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">МоїКонтакти</h1>
        <div className="wb-page-actions">
          <button type="button" className="wb-btn wb-btn-primary" onClick={() => void addContact()}>
            <Icon name="plus" size={16} />
            Додати контакт
          </button>
        </div>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження контактів…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && links.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="mail" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодного контакту.</p>
          {/* Кажемо, як він з'являється: контакт не заводять руками — його
              запрошують посиланням, і без цього порожній екран — глухий кут. */}
          <p className="wb-empty-text">
            Натисніть «Додати контакт» — посилання скопіюється саме. Надішліть його людині в
            Telegram: коли вона приєднається, контакт закріпиться за вами й з'явиться тут.
          </p>
        </div>
      )}

      {hasLinks && (
        <>
          <InvitesList
            links={links}
            copiedId={copiedId}
            onCopy={(link) => void copyLink(link)}
            onDelete={(link) => void deleteLink(link)}
          />

          <h2 className="wb-invite-section">Схема залучених</h2>
          <InvitesScheme links={links} />
        </>
      )}
    </div>
  );
}
