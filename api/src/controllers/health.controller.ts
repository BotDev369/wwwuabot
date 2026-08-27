/** GET /health — basic health check. */
export function handleHealth(): Response {
  return new Response(
    JSON.stringify({
      status: "ok",
      worker: "wwwuabot-api",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
