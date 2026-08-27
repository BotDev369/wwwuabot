/**
 * Environment bindings for the API Cloudflare Worker.
 * Declared here once, imported by all controllers and the router.
 */
export interface Env {
  DB: D1Database;
  CONTENT_KV: KVNamespace;
}
