/**
 * pglite 測試 DB：真 Postgres 語意（unique index、FK、jsonb、transaction），
 * schema 以 drizzle-kit 產出的 apps/api/drizzle/*.sql 套用 → 測試同時驗證 migration。
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from '../../src/repos/db';

const MIGRATIONS_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export interface TestDb {
    db: Db;
    close: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
    const client = new PGlite();
    const pglite = drizzle(client, { schema });
    await migrate(pglite, { migrationsFolder: MIGRATIONS_FOLDER });
    return {
        db: pglite as unknown as Db,
        close: () => client.close()
    };
}

/** 每個測試前清空（保留 schema） */
export async function resetDb(db: Db): Promise<void> {
    await db.execute(
        sql`TRUNCATE usage_log, run_candidates, materials, runs, banlist, players, config RESTART IDENTITY CASCADE`
    );
}
