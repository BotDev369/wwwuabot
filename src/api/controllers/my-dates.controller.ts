import type { Env } from "../../shared/types/env";
import { UserRepository } from "../../modules/users/user.repository";
import { getFamilyBox, saveFamilyBox } from "../../shared/utils/family-box";

const FAMILY = "my_dates";

interface MyDate {
  id: string;
  date: string;
  alias: string;
  category: string;
  notes: string;
  created_at: string;
}

function getDatesList(user: Record<string, any>): MyDate[] {
  const box = getFamilyBox(user, FAMILY);
  return Array.isArray(box.items) ? box.items : [];
}

function setDatesList(user: Record<string, any>, items: MyDate[]): void {
  const box = getFamilyBox(user, FAMILY);
  box.items = items;
  saveFamilyBox(user, FAMILY, box);
}

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function handleMyDates(request: Request, env: Env): Promise<Response> {
  const userIdStr = request.headers.get("X-Telegram-User-Id");
  if (!userIdStr) {
    return json({ ok: false, error: "X-Telegram-User-Id header required" }, 401);
  }
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    return json({ ok: false, error: "Invalid user_id" }, 401);
  }

  const userRepo = new UserRepository(env);
  let user = await userRepo.getUser(userId);

  if (!user) {
    // Створюємо мінімального юзера якщо його немає
    await userRepo.createUser({
      user_id: userId,
      first_name: "...",
      last_name: "...",
      username: "...",
      language: "...",
    });
    user = await userRepo.getUser(userId);
  }

  if (!user) {
    return json({ ok: false, error: "Failed to create user" }, 500);
  }

  // GET — список дат
  if (request.method === "GET") {
    const dates = getDatesList(user);
    return json({ ok: true, dates });
  }

  // POST — додати дату
  if (request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const { date, alias, category, notes } = body;
    if (!date) {
      return json({ ok: false, error: "date is required" }, 400);
    }

    const dates = getDatesList(user);
    const newDate: MyDate = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date,
      alias: alias || "",
      category: category || "",
      notes: notes || "",
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
    dates.push(newDate);
    setDatesList(user, dates);

    // Зберігаємо в БД
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(user)) {
      if (key !== "user_id") {
        updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
      }
    }
    await userRepo.updateUser(userId, updates);

    return json({ ok: true, id: newDate.id });
  }

  // DELETE — видалити дату
  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return json({ ok: false, error: "id query param required" }, 400);
    }

    const dates = getDatesList(user);
    const filtered = dates.filter((d) => d.id !== id);

    if (filtered.length === dates.length) {
      return json({ ok: false, error: "Date not found" }, 404);
    }

    setDatesList(user, filtered);

    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(user)) {
      if (key !== "user_id") {
        updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
      }
    }
    await userRepo.updateUser(userId, updates);

    return json({ ok: true });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
