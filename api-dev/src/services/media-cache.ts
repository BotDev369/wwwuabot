/**
 * Кеш медіа на межі: повторний показ фото не читає R2.
 *
 * Ключ не змінюється, тож відповідь лягає в `caches.default` на рік; прибирання
 * чистить і кеш (`dropCachedMedia`), інакше видалене фото ще видно.
 *
 * @module api-dev/src/services/media-cache
 */

/** Рік і `immutable`: ключ не змінюється, тож і перевіряти його ніколи. */
export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Синтетична адреса — щоб `workers.dev` і власний домен ділили один ключ.
 * `encodeURIComponent` робить її безпечною для пробілів і кирилиці в іменах.
 */
function cacheRequest(key: string): Request {
  return new Request(`https://media-cache.invalid/${encodeURIComponent(key)}`);
}

/** Сховище кеша або `null`: у тестах і поза воркером його немає. */
function store(): Cache | null {
  const storage = (globalThis as { caches?: CacheStorage }).caches;
  if (!storage || typeof storage.default?.match !== "function") return null;
  return storage.default;
}

/**
 * Віддати файл: з кеша, якщо він там є, інакше — з бакета й у кеш.
 *
 * Відсутній файл **не** кешується: «немає» — не факт про незмінний об'єкт, а
 * рядок, який може з'явитися.
 */
export async function serveCachedMedia(
  key: string,
  read: (key: string) => Promise<R2ObjectBody | null>,
): Promise<Response> {
  const cache = store();
  const cacheKey = cacheRequest(key);

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const object = await read(key);
  if (!object) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");

  // `clone()` — бо тіло віддаємо клієнту, а копію кладемо в кеш.
  const response = new Response(object.body, { headers });
  if (cache) await cache.put(cacheKey, response.clone());
  return response;
}

/** Прибрати файл із кеша — інакше видалене фото лишалось би видимим. */
export async function dropCachedMedia(key: string): Promise<void> {
  await store()?.delete(cacheRequest(key));
}
