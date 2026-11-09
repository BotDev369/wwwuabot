/**
 * Кеш медіа: **другий показ не читає R2**, а видалення чистить кеш.
 *
 * Обидві речі ламаються мовчки: без кеша все працює, лише дорожче; без чистки
 * видалене фото лишається видимим до року.
 *
 * @module api-dev/src/services/media-cache.test
 */

import { afterEach, describe, expect, it } from "vitest";
import { dropCachedMedia, serveCachedMedia } from "./media-cache";

const KEY = "shop/1/фото 1.png";

/** Кеш у пам'яті: та сама поверхня, яку використовує воркер. */
class FakeCache {
  entries = new Map<string, Response>();

  async match(request: Request): Promise<Response | undefined> {
    return this.entries.get(request.url)?.clone();
  }

  async put(request: Request, response: Response): Promise<void> {
    this.entries.set(request.url, response);
  }

  async delete(request: Request): Promise<boolean> {
    return this.entries.delete(request.url);
  }
}

function installCache(): FakeCache {
  const cache = new FakeCache();
  (globalThis as { caches?: unknown }).caches = { default: cache };
  return cache;
}

function object(bytes: number[] = [1, 2, 3]): R2ObjectBody {
  return {
    body: new Uint8Array(bytes),
    httpEtag: '"etag-1"',
    writeHttpMetadata: (headers: Headers) => headers.set("Content-Type", "image/png"),
  } as unknown as R2ObjectBody;
}

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
});

describe("віддання файлу через кеш", () => {
  it("перший показ читає бакет і кладе файл у кеш", async () => {
    const cache = installCache();
    const read = async () => object();

    const response = await serveCachedMedia(KEY, read);

    expect(response.status).toBe(200);
    expect(response.headers.get("ETag")).toBe('"etag-1"');
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(cache.entries.size).toBe(1);
  });

  it("другий показ бере з кеша й не питає бакет", async () => {
    installCache();
    let reads = 0;
    const read = async () => {
      reads += 1;
      return object();
    };

    await serveCachedMedia(KEY, read);
    const second = await serveCachedMedia(KEY, read);

    expect(reads).toBe(1);
    expect(second.status).toBe(200);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("різні ключі не змішуються", async () => {
    const cache = installCache();
    const read = async () => object();

    await serveCachedMedia("shop/1/a.png", read);
    await serveCachedMedia("shop/1/b.png", read);

    expect(cache.entries.size).toBe(2);
  });

  it("без кеша (тести, не-воркер) файл усе одно віддається", async () => {
    const response = await serveCachedMedia(KEY, async () => object());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("відсутній файл не кешується", async () => {
    const cache = installCache();

    const response = await serveCachedMedia(KEY, async () => null);

    expect(response.status).toBe(404);
    expect(cache.entries.size).toBe(0);
  });

  it("прибирання чистить кеш — наступний показ знову йде в бакет", async () => {
    installCache();
    let reads = 0;
    const read = async () => {
      reads += 1;
      return object();
    };

    await serveCachedMedia(KEY, read);
    await dropCachedMedia(KEY);
    await serveCachedMedia(KEY, read);

    expect(reads).toBe(2);
  });
});
