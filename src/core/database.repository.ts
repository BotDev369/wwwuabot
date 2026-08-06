import type { Env } from "../shared/types/env";

export class DatabaseRepository {
  protected db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }
}
