import type { AppContext } from "../../shared/types/env";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { log } from "../../shared/utils/debug";
import { handleTextInput } from "./text-input";
import { applyContactPayload } from "../../modules/contacts/contact-link";
import { showInviteScreen } from "../../modules/contacts/invite-screen";
import { showAccessDenied } from "../../modules/access/denied";
import { showMainKeyboard } from "../../modules/access/keyboard";
import { handleContactFlow } from "../../modules/access/contact/reply";
import { handleContactCallback } from "../../modules/access/contact/panel";
import { deleteIncomingMessage } from "../../shared/utils/message";
import { splitInviteCode } from "../../modules/access/payload";
import { isValidBotPayload, isValidSlug, toWebPath } from "@wwwuabot/shared/content";
import { hasAccess } from "@wwwuabot/shared/security/access";

/**
 * Головний роутер бота.
 * Бот — pure renderer: бере контент із таблиці scenarios і показує.
 *
 * Потоки:
 * 1. /start <payload> → код запрошення (екран вітання з першого переходу) або
 *    shared resolver → сторінка → рендер
 * 2. /start без payload → головна сторінка
 * 3. callback_data → slug → рендер
 * 4. текст → ТІЛЬКИ якщо awaits_input, інакше видаляємо; для людини без допуску
 *    перед цим показується відмова, а не тиша
 *
 * **Код запрошення перевіряється першим.** Він теж проходить
 * `isValidBotPayload` (це адреса, яку приймає Telegram), тож відрізнити його
 * від slug можна лише запитом. Якщо колись з'явиться сторінка зі slug, що
 * збігається з чужим кодом, переможе запрошення — код складає сервер, і
 * людина його не обирає, а от slug людина пише сама.
 *
 * **Вітаємо лише з першого переходу.** Друге відкриття того самого лінка — це
 * вже звичайний вхід у бота, і показувати на нього «вас щойно запросили» було б
 * неправдою (розрізняє їх `applyContactPayload`).
 *
 * **Бот закритий за запрошеннями**, тому кожен шлях до контенту проходить
 * `renderOrDeny`. Правило допуску спільне з платформою
 * (`@wwwuabot/shared/security/access`): закритий продукт закритий для обох
 * входів, інакше відмова в чаті оминається посиланням. Фільтр стоїть **після**
 * розбору payload: код запрошення в хвості — це і є допуск, і перевіряти раніше
 * значило б відмовити тому, хто щойно прийшов за лінком.
 */
export async function botRouter(ctx: AppContext): Promise<void> {
  if (!ctx.user) return;

  // Діалог з адміном — окремий шлях: він перехоплює кнопки реплай-клавіатури,
  // inline-кнопки панелі та фото/стікери, яких текстовий шлях не бачить. І
  // тільки для людини без допуску: у кого є доступ, цього діалогу не існує.
  if (!hasAccess(ctx.user)) {
    if (ctx.callbackQuery && (await handleContactCallback(ctx))) return;
    if (await handleContactFlow(ctx)) return;
  }

  const repo = new ScenarioRepository(ctx.env);
  const text = ctx.message?.text;
  const isCallback = !!ctx.callbackQuery;
  const isCommand = !!text?.startsWith("/");
  const isPlainText = !isCallback && !isCommand && !!text;

  if (!isCallback && !isCommand && !isPlainText) {
    log("ROUTER", "ignored | no actionable content");
    return;
  }

  if (isCommand) {
    const command = text!.split(" ")[0].split("@")[0];
    if (command === "/start") {
      const payload = text!.split(" ")[1]?.trim() ?? "";
      if (payload && !isValidBotPayload(payload)) {
        log("ROUTER", "deep link rejected | invalid payload", { payload });
        await deleteIncomingMessage(ctx);
        return;
      }
      log("ROUTER", "deep link", { payload, user_id: ctx.from?.id });

      // Код запрошення — хвіст payload, а не весь payload: посилання зі
      // сторінкою й кодом (`buildShareLinks`) має вести і туди, і сюди.
      const { inviteCode, pagePayload } = splitInviteCode(payload);

      // Особистий лінк веде не на сторінку контенту: код не є адресою, і
      // шукати сторінку з таким «slug» нема чого. Головна — для тих переходів,
      // де вітати нічого (вдруге, свій лінк, лінк без адреси платформи).
      if (inviteCode) {
        const contacted = await applyContactPayload(ctx, inviteCode);
        if (contacted.kind !== "unknown") {
          if (contacted.kind !== "invited" || !(await showInviteScreen(ctx, contacted.ownerId))) {
            await renderOrDeny(ctx, () => loadAndRenderPayload(ctx, repo, pagePayload), {
              keyboard: true,
            });
          }
          return;
        }
      }

      await renderOrDeny(ctx, () => loadAndRenderPayload(ctx, repo, pagePayload), {
        keyboard: true,
      });
      return;
    }
  }

  if (isCallback) {
    let slug = ctx.callbackQuery!.data || "";
    if (slug.includes("#")) slug = slug.split("#")[0];

    if (isValidSlug(slug)) {
      log("ROUTER", "callback navigation", { slug });
      await renderOrDeny(ctx, () => loadAndRenderScenario(ctx, repo, slug));
    } else {
      log("ROUTER", "callback rejected | invalid slug", { data: ctx.callbackQuery!.data });
    }
    return;
  }

  if (isPlainText) {
    // Людина без допуску пише в чат — значить, їй уже незручно мовчати. Показуємо
    // відмову (з кнопкою зв'язку з адміном) замість тиші: інакше її перше
    // повідомлення просто зникало б, а «Написати адміну» — разом із ним.
    if (!hasAccess(ctx.user)) {
      log("ACCESS", "denied | plain text", { user_id: ctx.user.user_id });
      await deleteIncomingMessage(ctx);
      await showAccessDenied(ctx);
      return;
    }

    const currentScenario = await repo.getScenario(ctx.user.active_scenario || "");

    if (currentScenario?.awaits_input === "text") {
      const result = handleTextInput(text!, currentScenario);
      if (result.type === "accept") {
        log("ROUTER", "text input accepted", { value: result.value });
        await renderOrDeny(ctx, () => loadAndRenderScenario(ctx, repo, currentScenario.slug));
        return;
      }
    }

    log("ROUTER", "text input ignored | no awaits_input", {
      text: text!.substring(0, 50),
      active_scenario: ctx.user.active_scenario,
    });
    await deleteIncomingMessage(ctx);
  }
}

/**
 * Єдина точка, де контент або стає видимим, або ні.
 *
 * Відмова не «помилка», а відповідь: тому вона й має бути тут, а не в кожному
 * місці, де роутер вирішує показати сценарій. Повідомлення людини видаляється
 * тим самим способом, яким видаляється нерозбране, — у чаті лишається лише
 * відповідь бота.
 *
 * `render` — саме той спосіб, яким цей шлях показує екран: адреса з `?start=`
 * шукається як payload, а callback — як slug. Різниця лишається в тих, хто
 * показує; рішення «показувати чи ні» — спільне.
 */
async function renderOrDeny(
  ctx: AppContext,
  render: () => Promise<void>,
  options: { keyboard?: boolean } = {},
): Promise<void> {
  if (!hasAccess(ctx.user)) {
    log("ACCESS", "denied", { user_id: ctx.user?.user_id });
    await deleteIncomingMessage(ctx);
    await showAccessDenied(ctx);
    return;
  }

  await render();

  // Клавіатуру показуємо на вході (`/start`), а не на кожному екрані:
  // `sendMessage` після кожного кроку плодив би повідомлення в чаті, тоді як
  // реплай-клавіатура й так лишається під ним сама.
  if (options.keyboard) await showMainKeyboard(ctx);
}

async function loadAndRenderPayload(
  ctx: AppContext,
  repo: ScenarioRepository,
  payload: string,
): Promise<void> {
  const scenario = await repo.getScenarioByBotPayload(payload);
  if (!scenario) {
    log("ROUTER", "scenario not found", { payload });
    await deleteIncomingMessage(ctx);
    return;
  }
  setScenarioScreen(ctx, scenario, scenario.web_path);
}

async function loadAndRenderScenario(
  ctx: AppContext,
  repo: ScenarioRepository,
  slug: string,
): Promise<void> {
  const scenario = await repo.getScenario(slug);
  if (!scenario) {
    log("ROUTER", "scenario not found", { slug });
    await deleteIncomingMessage(ctx);
    return;
  }
  setScenarioScreen(ctx, scenario);
}

function setScenarioScreen(
  ctx: AppContext,
  scenario: import("../../shared/types/scenario").Scenario,
  webPath?: string,
): void {
  log("ROUTER", "scenario loaded", {
    slug: scenario.slug,
    keyboard_type: scenario.keyboard_type,
    buttons_rows: scenario.buttons.length,
    awaits_input: scenario.awaits_input,
    rich_message: scenario.rich_message,
  });

  if (ctx.user && ctx.user.active_scenario !== scenario.slug) {
    ctx.user.active_scenario = scenario.slug;
    ctx.userDirty = true;
  }

  const routePath = webPath ?? toWebPath(scenario.slug);

  ctx.screen = {
    slug: scenario.slug,
    title: scenario.title,
    photo_url: scenario.photo_url,
    caption: {
      top: scenario.caption_top ?? undefined,
      mid: scenario.caption_mid ?? undefined,
      bot: scenario.caption_bot ?? undefined,
    },
    buttons: scenario.buttons,
    qty_options: scenario.qty_options,
    price: scenario.price,
    notify_groups: scenario.notify_groups,
    notify_template: scenario.notify_template,
    rich_message: scenario.rich_message,
    rich_data: scenario.rich_data,
    web_path: routePath,
  };
}
