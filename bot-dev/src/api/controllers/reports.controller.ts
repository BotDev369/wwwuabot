/**
 * HTTP-вхід звітів: `POST /reports` (прийом) і `GET /reports` (історія), обидва
 * за ключем. Метод, якого немає — `405`, а не тихо `404`: інакше зламаний
 * скрипт виглядав би як «ендпоінта немає».
 *
 * @module bot-dev/src/api/controllers/reports.controller
 */

import type { Env } from "../../shared/types/env";
import { acceptReport } from "../../modules/reports/ingest";
import { listReports } from "../../modules/reports/read";

export async function handleReportsRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "POST") return acceptReport(request, env);
  if (request.method === "GET") return listReports(request, env);
  return new Response("Method Not Allowed", { status: 405 });
}
