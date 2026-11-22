import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";
import { DEFAULT_BUYER_PHOTO, buyerAvatar } from "./buyer-avatar";

interface Stored {
  key: string;
  contentType?: string;
}

function env(stored: Stored[], failPut = false): Env {
  const bucket = {
    put: async (key: string, _bytes: ArrayBuffer, options?: R2PutOptions) => {
      if (failPut) throw new Error("r2 down");
      const meta = options?.httpMetadata as R2HTTPMetadata | undefined;
      stored.push({ key, contentType: meta?.contentType });
    },
  };
  return { BOT_TOKEN: "token", SHOP_MEDIA: bucket } as unknown as Env;
}

/** Три відповіді Telegram: фото → файл → байти. */
function telegram(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("getUserProfilePhotos")) {
        return new Response(
          JSON.stringify({ ok: true, result: { photos: [[{ file_id: "f1" }]] } }),
        );
      }
      if (String(url).includes("getFile")) {
        return new Response(JSON.stringify({ ok: true, result: { file_path: "photos/a.jpg" } }));
      }
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buyerAvatar", () => {
  it("завантажує байти в R2 і віддає адресу шлюзу", async () => {
    telegram();
    const stored: Stored[] = [];

    const url = await buyerAvatar(env(stored), 777);

    expect(url).toMatch(/^\/api\/shop\/media\/shop\/avatars\/777-[a-f0-9]+\.jpg$/);
    expect(stored).toHaveLength(1);
    expect(stored[0].contentType).toBe("image/jpeg");
  });

  it("без токена або бакета — дефолтне фото", async () => {
    expect(await buyerAvatar({} as Env, 777)).toBe(DEFAULT_BUYER_PHOTO);
  });

  it("мережа впала — дефолтне фото, без винятку", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    expect(await buyerAvatar(env([]), 777)).toBe(DEFAULT_BUYER_PHOTO);
  });
});
