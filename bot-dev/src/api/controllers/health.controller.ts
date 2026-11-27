/**
 * Liveness бота: воркер відповідає.
 *
 * Свідомо не торкається D1 — `/health` мусить бути миттєвим і не залежати від
 * того, що перевіряє. Чому ендпоїнт є: без нього зламаний деплой бота не
 * бачить ніхто (`docs/MONITORING.md`).
 * @module bot-dev/src/api/controllers/health.controller
 */

/** GET /health — воркер відповідає; без БД, бо це liveness, а не діагностика. */
export function handleHealth(): Response {
  return new Response(
    JSON.stringify({ status: "ok", worker: "wwwuabot-bot", timestamp: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Монітор мусить бачити поточний стан, а не п'ятихвилинну давнину.
        "Cache-Control": "no-store",
      },
    },
  );
}
