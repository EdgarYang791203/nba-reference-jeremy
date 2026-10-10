import { asc, eq, sql } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type PlayerRow = typeof schema.players.$inferSelect;
export type PlayerInsert = typeof schema.players.$inferInsert;

export function createPlayersRepo(db: Db) {
    return {
        listAll(): Promise<PlayerRow[]> {
            return db.select().from(schema.players).orderBy(asc(schema.players.name));
        },

        listActive(): Promise<PlayerRow[]> {
            return db
                .select()
                .from(schema.players)
                .where(eq(schema.players.active, true))
                .orderBy(asc(schema.players.name));
        },

        async getById(id: number): Promise<PlayerRow | null> {
            const rows = await db.select().from(schema.players).where(eq(schema.players.id, id)).limit(1);
            return rows[0] ?? null;
        },

        /** seed / roster 更新：以 (name, team) upsert，回傳 {inserted, updated} 計數 */
        async upsertByNameTeam(rows: PlayerInsert[]): Promise<{ inserted: number; updated: number }> {
            if (!rows.length) {
                return { inserted: 0, updated: 0 };
            }
            const result = await db
                .insert(schema.players)
                .values(rows)
                .onConflictDoUpdate({
                    target: [schema.players.name, schema.players.team],
                    set: {
                        birthDate: sql`excluded.birth_date`,
                        season: sql`excluded.season`,
                        active: sql`excluded.active`,
                        source: sql`excluded.source`,
                        updatedAt: new Date()
                    }
                })
                .returning({ id: schema.players.id, createdAt: schema.players.createdAt, updatedAt: schema.players.updatedAt });
            // 新插入者 createdAt 與 updatedAt 差距極小；更新者 updatedAt 明顯較晚
            let inserted = 0;
            for (const r of result) {
                if (Math.abs(r.updatedAt.getTime() - r.createdAt.getTime()) < 1000) {
                    inserted += 1;
                }
            }
            return { inserted, updated: result.length - inserted };
        },

        async setActive(id: number, active: boolean): Promise<void> {
            await db.update(schema.players).set({ active, updatedAt: new Date() }).where(eq(schema.players.id, id));
        }
    };
}
