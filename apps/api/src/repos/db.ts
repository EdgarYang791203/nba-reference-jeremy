import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@nba/shared';

/** 所有 Drizzle 存取集中在 repos/，業務邏輯不直接碰 query（計畫書 3.2）。
 *  lazy init：測試與未設 DATABASE_URL 的環境不會嘗試連線。 */
let _db: ReturnType<typeof createDb> | null = null;

function createDb(url: string) {
    // Neon serverless：關 prepare 以相容 connection pooler
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema });
}

export function getDb() {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not set');
        }
        _db = createDb(url);
    }
    return _db;
}
