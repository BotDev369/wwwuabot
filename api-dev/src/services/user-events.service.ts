/**
 * Запис у журнал дій: зміна стану, сторінка, поверхня, жест (`docs/EVENTS.md`).
 * Читання й прибирання для адмінки — сусідній `user-events-admin.service.ts`.
 * Запис іде в `waitUntil`: дія вже сталася, і помилка журналу не робить запит
 * помилковим.
 *
 * @module api-dev/src/services/user-events.service
 */

import {
  platformAction,
  shouldRecordPlatformAction,
  type PlatformGestureKind,
} from "@wwwuabot/shared/events";
import { recordUserEvent } from "@wwwuabot/shared/database/user-events";
import type { Env } from "../shared/types";
import { tryResolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import { readFullEventLogging } from "./user-events-admin.service";

/**
 * Зміна стану на платформі в журнал; `at` — момент запиту, бо запис іде в
 * `waitUntil`. `GET` не пишеться взагалі: це завантаження даних, а не дія
 * людини (`docs/EVENTS.md`).
 */
export async function recordPlatformAction(
  request: Request,
  env: Env,
  status: number,
  at?: number,
): Promise<void> {
  try {
    const { pathname } = new URL(request.url);
    if (!shouldRecordPlatformAction(request.method, pathname)) return;

    const userId = await tryResolveUserId(request, env);
    if (userId === null) return;

    await recordUserEvent(
      env.DB,
      {
        userId,
        surface: "platform",
        kind: "request",
        action: platformAction(request.method, pathname),
        status: status < 400 ? "ok" : "error",
      },
      at,
    );
  } catch (error) {
    apiLog.error("events: запис дії платформи", error);
  }
}

/**
 * Відкритий екран — рядок від самого застосунку: він один знає, що людина
 * перейшла на екран, а не що компонент перезапитав дані. `at` везе час
 * переходу: назва сторінки контенту приходить пізніше за адресу.
 */
export async function recordPlatformView(
  env: Env,
  userId: number,
  screen: string,
  title?: string | null,
  at?: number,
): Promise<void> {
  await recordUserEvent(
    env.DB,
    {
      userId,
      surface: "platform",
      kind: "view",
      // Назва екрана з хедера — те, що людина бачить; без неї лишається ключ.
      action: title?.trim() || screen,
    },
    at,
  );
}

/**
 * Модалка, яку відкрили: її назва з шапки — і є назва дії. Подробиці —
 * сторінка, з якої її відкрили: товар у «GalyaShop» і товар в «Обране» — різні
 * речі з однаковою шапкою.
 */
export async function recordPlatformModal(
  env: Env,
  userId: number,
  modal: { screen: string; title: string; page: string | null },
  at?: number,
): Promise<void> {
  await recordUserEvent(
    env.DB,
    {
      userId,
      surface: "platform",
      kind: "modal",
      action: modal.title,
      details: modal.page,
    },
    at,
  );
}

/**
 * Жести в застосунку: дотик до кнопки/вкладки/картки, вибір і уведений текст.
 *
 * Пише їх теж застосунок — сервер не бачить дотику, лише наслідок. Скільки
 * саме писати, вирішує налаштування `event_log_full`: без нього журнал
 * лишається на рівні «екран + зміна стану» (`docs/EVENTS.md`).
 */
export async function recordPlatformGesture(
  env: Env,
  userId: number,
  gesture: {
    kind: PlatformGestureKind;
    screen: string;
    label: string;
    field: string | null;
    page: string | null;
  },
  at?: number,
): Promise<void> {
  if (!(await readFullEventLogging(env))) return;
  await recordUserEvent(
    env.DB,
    {
      userId,
      surface: "platform",
      kind: gesture.kind,
      action: gesture.label,
      // Подробиці — місце дії: без нього однакові підписи («Закрити», «Додати»)
      // з різних сторінок зливаються в купу. Уведеному тексту додається назва
      // поля: без неї значення не пояснює себе.
      details:
        [gesture.kind === "input" && fieldLabel(gesture.field), gesture.page]
          .filter(Boolean)
          .join(" · ") || null,
    },
    at,
  );
}

/** Назва поля уведеного тексту — з підписом, щоб не плутати з місцем дії. */
function fieldLabel(field: string | null): string | null {
  return field ? `Поле «${field}»` : null;
}
