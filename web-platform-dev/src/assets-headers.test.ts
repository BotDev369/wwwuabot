/**
 * `_headers` проти `secureResponse`: рівність, яку ніхто інший не побачить.
 * Наявні асети шар віддає повз воркер, тож правила для них живуть окремим
 * файлом — і тут падає саме те, що інакше тихо розійшлося б: CSP,
 * `X-Frame-Options` чи `no-store`, змінені в одному місці й забуті в іншому.
 *
 * @module web-platform-dev/src/assets-headers.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { applySecurityHeaders } from "@wwwuabot/shared/security/headers";

const FILE = new URL("../public/_headers", import.meta.url);

/** Заголовки, які шар асетів має ставити на кожен файл `dist/client`. */
function parsed(): Map<string, string> {
  const text = readFileSync(FILE, "utf8");
  const headers = new Map<string, string>();
  for (const line of text.split("\n")) {
    const at = line.indexOf(":");
    if (!line.trim().startsWith("/*") && at > 0) {
      headers.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
    }
  }
  return headers;
}

describe("_headers для шару асетів", () => {
  const headers = parsed();

  it("ставить ті самі заголовки безпеки, що й воркер", () => {
    // `null` замість тіла: без нього `Response` сам додає `content-type`, і
    // порівняння спіткнулось би на заголовку, якого ми не ставимо.
    const expected = applySecurityHeaders(new Response(null), { csp: true, hsts: true }).headers;
    for (const [name, value] of expected) {
      expect(headers.get(name), `${name} у _headers`).toBe(value);
    }
  });

  it("не дає браузеру тримати старий бандл", () => {
    expect(headers.get("cache-control")).toContain("no-store");
  });

  it("правило одне — на весь шар, без винятків для окремих шляхів", () => {
    const rules = readFileSync(FILE, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith(" ") && !line.startsWith("#"));
    expect(rules).toEqual(["/*"]);
  });
});
