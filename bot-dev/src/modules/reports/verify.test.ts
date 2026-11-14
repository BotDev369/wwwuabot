import { afterEach, describe, expect, it, vi } from "vitest";
import { AUDIENCE, claimsValid, verifyGitHubToken } from "./verify";

const ISS = "https://token.actions.githubusercontent.com";

function claims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: ISS,
    aud: AUDIENCE,
    repository: "BotDev369/wwwuabot",
    ref: "refs/heads/main",
    exp: now + 300,
    iat: now,
    ...overrides,
  };
}

function base64url(value: ArrayBuffer | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Справжній RS256-підпис: перевірка не має вірити заголовку на слово. */
async function signedToken(tamper = false): Promise<string> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as JsonWebKey;
  vi.stubGlobal(
    "fetch",
    async () => new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: "k1" }] })),
  );

  const header = base64url(JSON.stringify({ alg: "RS256", kid: "k1" }));
  const payload = base64url(JSON.stringify(claims()));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  const token = `${header}.${payload}.${base64url(signature)}`;
  return tamper ? token.replace(/.$/, (char) => (char === "A" ? "B" : "A")) : token;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("claimsValid", () => {
  it("accepts a token from a main-branch deploy of this repo", () => {
    expect(claimsValid(claims())).toBe(true);
  });

  it("rejects another repository", () => {
    expect(claimsValid(claims({ repository: "someone/else" }))).toBe(false);
  });

  it("rejects another branch", () => {
    expect(claimsValid(claims({ ref: "refs/heads/feature" }))).toBe(false);
  });

  it("rejects a foreign audience", () => {
    expect(claimsValid(claims({ aud: "something-else" }))).toBe(false);
  });

  it("rejects an expired token", () => {
    expect(claimsValid(claims({ exp: Math.floor(Date.now() / 1000) - 10 }))).toBe(false);
  });
});

describe("verifyGitHubToken", () => {
  it("accepts a token with a valid signature", async () => {
    expect(await verifyGitHubToken(await signedToken())).toBe(true);
  });

  it("rejects a tampered signature", async () => {
    expect(await verifyGitHubToken(await signedToken(true))).toBe(false);
  });

  it("rejects a missing token", async () => {
    expect(await verifyGitHubToken(undefined)).toBe(false);
  });

  it("rejects a token that is not a jwt", async () => {
    expect(await verifyGitHubToken("abc")).toBe(false);
  });
});
