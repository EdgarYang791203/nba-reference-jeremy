import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type MaterialRow = typeof schema.materials.$inferSelect;
export type MaterialInsert = typeof schema.materials.$inferInsert;

export interface MaterialListQuery {
    playerId?: number;
    from?: string;
    to?: string;
    source?: string;
    page?: number;
    pageSize?: number;
    /** 預設只列 published；管理用途可傳 'all' */
    status?: 'published' | 'hidden' | 'all';
}

export function createMaterialsRepo(db: Db) {
    return {
        async list(query: MaterialListQuery): Promise<{ items: MaterialRow[]; total: number; page: number; pageSize: number }> {
            const page = Math.max(1, query.page ?? 1);
            const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
            const status = query.status ?? 'published';

            const conditions = [
                status === 'all' ? undefined : eq(schema.materials.status, status),
                query.playerId !== undefined ? eq(schema.materials.playerId, query.playerId) : undefined,
                query.from ? gte(schema.materials.date, query.from) : undefined,
                query.to ? lte(schema.materials.date, query.to) : undefined,
                query.source ? eq(schema.materials.sourceName, query.source) : undefined
            ].filter((c): c is NonNullable<typeof c> => c !== undefined);

            const where = conditions.length ? and(...conditions) : undefined;

            const [items, [{ total }]] = await Promise.all([
                db
                    .select()
                    .from(schema.materials)
                    .where(where)
                    .orderBy(desc(schema.materials.createdAt), desc(schema.materials.id))
                    .limit(pageSize)
                    .offset((page - 1) * pageSize),
                db.select({ total: count() }).from(schema.materials).where(where)
            ]);

            return { items, total: Number(total), page, pageSize };
        },

        async getById(id: number): Promise<MaterialRow | null> {
            const rows = await db.select().from(schema.materials).where(eq(schema.materials.id, id)).limit(1);
            return rows[0] ?? null;
        },

        /** sourceUrl 唯一：重複者忽略（冪等） */
        async insertMany(rows: MaterialInsert[]): Promise<MaterialRow[]> {
            if (!rows.length) {
                return [];
            }
            return db.insert(schema.materials).values(rows).onConflictDoNothing({ target: schema.materials.sourceUrl }).returning();
        },

        async setStatus(id: number, status: 'published' | 'hidden'): Promise<MaterialRow | null> {
            const rows = await db.update(schema.materials).set({ status }).where(eq(schema.materials.id, id)).returning();
            return rows[0] ?? null;
        }
    };
}
