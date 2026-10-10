import { eq } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type BanlistRow = typeof schema.banlist.$inferSelect;

export function createBanlistRepo(db: Db) {
    return {
        listAll(): Promise<BanlistRow[]> {
            return db.select().from(schema.banlist);
        },

        async idSet(): Promise<Set<number>> {
            const rows = await db.select({ playerId: schema.banlist.playerId }).from(schema.banlist);
            return new Set(rows.map((r) => r.playerId));
        },

        async add(playerId: number, reason: string | null, bannedBy: string): Promise<BanlistRow> {
            const [row] = await db
                .insert(schema.banlist)
                .values({ playerId, reason, bannedBy })
                .onConflictDoUpdate({
                    target: schema.banlist.playerId,
                    set: { reason, bannedBy, bannedAt: new Date() }
                })
                .returning();
            return row;
        },

        async remove(playerId: number): Promise<boolean> {
            const rows = await db.delete(schema.banlist).where(eq(schema.banlist.playerId, playerId)).returning();
            return rows.length > 0;
        }
    };
}
