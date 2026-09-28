import { eq } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export function createConfigRepo(db: Db) {
    return {
        async getAll(): Promise<Record<string, unknown>> {
            const rows = await db.select().from(schema.config);
            return Object.fromEntries(rows.map((r) => [r.key, r.value]));
        },

        async set(key: string, value: unknown): Promise<void> {
            await db
                .insert(schema.config)
                .values({ key, value })
                .onConflictDoUpdate({ target: schema.config.key, set: { value } });
        },

        async remove(key: string): Promise<void> {
            await db.delete(schema.config).where(eq(schema.config.key, key));
        }
    };
}
