import type { Env } from "../../shared/types/env";

export async function handleAuthCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const userIdStr = url.searchParams.get("user_id");

  if (!userIdStr) {
    return new Response(
      JSON.stringify({ exists: false, error: "user_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    return new Response(
      JSON.stringify({ exists: false, error: "invalid user_id" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const row = await env.DB.prepare(
      "SELECT user_id FROM users WHERE user_id = ?"
    )
      .bind(userId)
      .first();

    return new Response(
      JSON.stringify({ exists: !!row }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ exists: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
