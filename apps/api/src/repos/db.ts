import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@nba/shared';

/**
 * 所有 Drizzle 存取集中在 repos/（計畫書 3.2）。
 * `Db` 型別同時容納正式的 postgres-js 與測試的 pglite driver。
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(url: string): Db {
    // Neon serverless：關 prepare 以相容 connection pooler
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema }) as unknown as Db;
}

let _db: Db | null = null;

/** lazy init：測試與未設 DATABASE_URL 的環境不會嘗試連線。 */
export function getDb(): Db {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not set');
        }
        _db = createDb(url);
    }
    return _db;
}
