import type { Env } from "../../shared/types/env";
import { DbProxyService } from "../services/db-proxy.service";

export async function handleDbProxy(request: Request, env: Env): Promise<Response> {
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const secret = request.headers.get("X-Secret");
  if (secret !== env.SECRET_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action, codeword, data } = body;
  const service = new DbProxyService(env);

  switch (action) {
    case "read":
      if (!codeword) return json({ error: "codeword required" }, 400);
      return json(await service.read(codeword));

    case "write":
      if (!codeword || !data) return json({ error: "codeword and data required" }, 400);
      return json(await service.write(codeword, data));

    case "delete":
      if (!codeword) return json({ error: "codeword required" }, 400);
      return json(await service.delete(codeword));

    case "list_users":
      return json(await service.listUsers());

    case "update_users":
      if (!Array.isArray(data) || data.length === 0) {
        return json({ error: "data (масив користувачів) обов'язковий" }, 400);
      }
      return json(await service.updateUsers(data));

    case "read_settings":
      return json(await service.readSettings());

    case "update_settings":
      if (!data || typeof data !== "object") {
        return json({ error: "data (об'єкт полів) обов'язковий" }, 400);
      }
      return json(await service.updateSettings(data));

    default:
      return json({ error: `Unknown action: ${action}` }, 400);
  }
}
