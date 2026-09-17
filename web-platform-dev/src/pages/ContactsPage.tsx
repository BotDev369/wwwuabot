/**
 * «МоїКонтакти» — особисті лінки й те, кого вони закріпили.
 *
 * Екран лише **зводить** те, що вже є: картки й схему дає спільний
 * `@wwwuabot/ui/invites`, дані — `useInvites`, а адреса й власник — ця
 * оболонка. Тому тут немає ні розмітки картки, ні правила «хто приєднався»:
 * усе це перевіряється тестами в спільному модулі, незалежно від платформи.
 *
 * **Два блоки, і порядок навмисний.** «МоїЛінки-Контакти» — те, що людина
 * надсилає (дія), схема — те, що з цього вийшло (результат). Спочатку те, що
 * можна зробити зараз, потім — що вже сталось.
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
   * Створення лінка: підпис питаємо діалогом, бо людина має назвати контакт —
   * без підпису список перетвориться на стовпчик однакових кодів.
   */
  async function createLink(): Promise<void> {
    const answer = await dialog.prompt("Як звати людину, якій ви надсилаєте лінк?", {
      title: "Новий лінк",
      placeholder: "Ім'я контакту",
      validate: (value) =>
        sanitizeInviteLabel(value) === "" ? "Підпис не може бути порожнім" : null,
    });
    if (answer === null) return;

    try {
      await create(sanitizeInviteLabel(answer));
      await dialog.alert(
        "Лінк готовий. Надішліть його в Telegram — і контакт з'явиться тут, коли людина приєднається.",
        { title: "Готово" },
      );
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося створити лінк", {
        title: "Помилка",
      });
    }
  }

  async function copyLink(link: InviteLink): Promise<void> {
    if (!link.deepLink) return;
    try {
      await navigator.clipboard.writeText(link.deepLink);
      setCopiedId(link.id);
    } catch {
      // Буфер обміну закритий — показуємо лінк текстом, щоб його можна було
      // скопіювати руками: мовчазна невдача тут гірша за будь-яке повідомлення.
      await dialog.alert(`Скопіювати не вдалося. Ось лінк:\n${link.deepLink}`, {
        title: "Скопіюйте вручну",
      });
    }
  }

  async function deleteLink(link: InviteLink): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати лінк «${link.label}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await remove(link.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати лінк", {
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
          <button type="button" className="wb-btn wb-btn-primary" onClick={() => void createLink()}>
            <Icon name="plus" size={16} />
            Створити лінк
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
            Натисніть «Створити лінк» і надішліть посилання людині в Telegram: коли вона
            приєднається, контакт закріпиться за вами й з'явиться тут.
          </p>
        </div>
      )}

      {hasLinks && (
        <>
          <h2 className="wb-invite-section">МоїЛінки-Контакти</h2>
          <p className="wb-invite-section-hint">
            Лінк персональний: хто перший за ним прийде — той і закріплений.
          </p>
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
