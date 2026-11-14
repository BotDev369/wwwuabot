/**
 * Хто має право надіслати звіт: GitHub Actions із цього репозиторію. Замість
 * секрета — OIDC-токен джоби: воркер перевіряє підпис за JWKS GitHub і
 * твердження `repository`, `ref`, `aud`, `exp`.
 *
 * @module bot-dev/src/modules/reports/verify
 */

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const REPO = "BotDev369/wwwuabot";
const REF = "refs/heads/main";

/** Аудиторія наша, а не GitHub-ова: чужий токен із тим самим issuer не підійде. */
export const AUDIENCE = "wwwuabot-deploy-report";

interface Claims {
  iss?: string;
  aud?: string | string[];
  repository?: string;
  ref?: string;
  exp?: number;
  iat?: number;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

let cached: { at: number; keys: Jwk[] } | null = null;
const CACHE_MS = 600_000;

function decode(part: string): Record<string, unknown> | null {
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

function fromBase64Url(part: string): Uint8Array {
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Твердження токена. Чиста функція: тести не потребують мережі. */
export function claimsValid(claims: Claims, now = Date.now()): boolean {
  if (claims.iss !== ISSUER) return false;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(AUDIENCE)) return false;
  if (claims.repository !== REPO) return false;
  if (claims.ref !== REF) return false;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return false;
  if (typeof claims.iat === "number" && claims.iat * 1000 < now - 900_000) return false;
  return true;
}

async function keys(): Promise<Jwk[]> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.keys;
  const response = await fetch(JWKS_URL);
  if (!response.ok) return cached?.keys ?? [];
  const data = (await response.json()) as { keys?: Jwk[] };
  cached = { at: now, keys: data.keys ?? [] };
  return cached.keys;
}

/** Підпис і твердження; будь-яка невдача — `false`, а не виняток. */
export async function verifyGitHubToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [rawHeader, rawPayload, rawSignature] = token.split(".");
  if (!rawHeader || !rawPayload || !rawSignature) return false;

  const header = decode(rawHeader) as { alg?: string; kid?: string } | null;
  const payload = decode(rawPayload) as Claims | null;
  if (!header || !payload || header.alg !== "RS256") return false;
  if (!claimsValid(payload)) return false;

  const all = await keys();
  const jwk = all.find((key) => !header.kid || key.kid === header.kid);
  if (!jwk) return false;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      fromBase64Url(rawSignature),
      new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
    );
  } catch {
    return false;
  }
}
