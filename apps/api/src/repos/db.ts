import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@nba/shared';

/**
 * 所有 Drizzle 存取集中在 repos/（計畫書 3.2）。
 * `Db` 型別同時容納正式的 postgres-js 與測試／本地的 pglite driver。
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(url: string): Db {
    // Neon serverless：關 prepare 以相容 connection pooler
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema }) as unknown as Db;
}

/**
 * 本地無 Neon 時的開發用 DB：`DATABASE_URL=pglite://<資料夾>`（例：pglite://./.data/dev），
 * 啟動時自動套 migration。pglite 為 devDependency，正式環境不會走到這裡。
 */
export async function createPgliteDb(dir: string): Promise<Db> {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const { mkdirSync } = await import('node:fs');

    // pglite 只建最後一層資料夾，先把父層建好
    mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    const db = drizzlePglite(client, { schema });
    const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
    await migrate(db, { migrationsFolder });
    return db as unknown as Db;
}

export function isPgliteUrl(url: string): boolean {
    return url.startsWith('pglite://');
}

let _db: Db | null = null;

/** lazy init：測試與未設 DATABASE_URL 的環境不會嘗試連線。pglite URL 請改用 resolveDbFromEnv()。 */
export function getDb(): Db {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error('DATABASE_URL is not set');
        }
        if (isPgliteUrl(url)) {
            throw new Error('pglite DATABASE_URL must be resolved with resolveDbFromEnv() before createApp()');
        }
        _db = createDb(url);
    }
    return _db;
}

/** 啟動用：依 DATABASE_URL 建立 db（pglite 需 async migrate）。 */
export async function resolveDbFromEnv(url = process.env.DATABASE_URL): Promise<Db> {
    if (!url) {
        throw new Error('DATABASE_URL is not set');
    }
    if (isPgliteUrl(url)) {
        _db = await createPgliteDb(url.slice('pglite://'.length));
        return _db;
    }
    return getDb();
}
