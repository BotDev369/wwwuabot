import type { Env } from "../../shared/types/env";

export function handleStatus(env: Env): Response {
  return new Response(
    JSON.stringify({
      status: "Bot is running",
      env: env.ENVIRONMENT,
      cloudinary: env.CLOUDINARY_CLOUD_NAME,
      has_bot_token: !!env.BOT_TOKEN,
      has_secret_token: !!env.SECRET_TOKEN,
      secret_token_length: env.SECRET_TOKEN?.length ?? 0,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
