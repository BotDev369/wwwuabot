import type { Env } from "../../shared/types/env";

export function handleStatus(env: Env): Response {
  return new Response(
    JSON.stringify({
      status: "Bot is running",
      env: env.ENVIRONMENT,
      cloudinary: env.CLOUDINARY_CLOUD_NAME,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}