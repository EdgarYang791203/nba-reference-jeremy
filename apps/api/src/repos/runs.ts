import { desc, eq } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type RunRow = typeof schema.runs.$inferSelect;
export type RunInsert = typeof schema.runs.$inferInsert;
export type RunStatus = RunRow['status'];

export function createRunsRepo(db: Db) {
    return {
        async get(date: string): Promise<RunRow | null> {
            const rows = await db.select().from(schema.runs).where(eq(schema.runs.date, date)).limit(1);
            return rows[0] ?? null;
        },

        async upsert(row: RunInsert): Promise<RunRow> {
            const [saved] = await db
                .insert(schema.runs)
                .values(row)
                .onConflictDoUpdate({ target: schema.runs.date, set: row })
                .returning();
            return saved;
        },

        async patch(date: string, partial: Partial<Omit<RunInsert, 'date'>>): Promise<RunRow | null> {
            const rows = await db.update(schema.runs).set(partial).where(eq(schema.runs.date, date)).returning();
            return rows[0] ?? null;
        },

        listRecent(limit = 30): Promise<RunRow[]> {
            return db.select().from(schema.runs).orderBy(desc(schema.runs.date)).limit(limit);
        }
    };
}
