import { and, eq, gte, ne, sum } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type UsageRow = typeof schema.usageLog.$inferSelect;
export type UsageInsert = typeof schema.usageLog.$inferInsert;

export function createUsageRepo(db: Db) {
    return {
        async insert(row: UsageInsert): Promise<UsageRow> {
            const [saved] = await db.insert(schema.usageLog).values(row).returning();
            return saved;
        },

        async insertMany(rows: UsageInsert[]): Promise<UsageRow[]> {
            if (!rows.length) {
                return [];
            }
            return db.insert(schema.usageLog).values(rows).returning();
        },

        /** 某日全站費用（排程 + 互動） */
        async sumCostForDate(date: string): Promise<number> {
            const [row] = await db
                .select({ total: sum(schema.usageLog.costUsd) })
                .from(schema.usageLog)
                .where(eq(schema.usageLog.date, date));
            return Number(row?.total ?? 0);
        },

        /** 自某日起（含）的費用；interactiveOnly 排除 actor='scheduler' */
        async sumCostSince(dateFrom: string, options: { interactiveOnly?: boolean } = {}): Promise<number> {
            const conditions = [gte(schema.usageLog.date, dateFrom)];
            if (options.interactiveOnly) {
                conditions.push(ne(schema.usageLog.actor, 'scheduler'));
            }
            const [row] = await db
                .select({ total: sum(schema.usageLog.costUsd) })
                .from(schema.usageLog)
                .where(and(...conditions));
            return Number(row?.total ?? 0);
        },

        listByDate(date: string): Promise<UsageRow[]> {
            return db.select().from(schema.usageLog).where(eq(schema.usageLog.date, date));
        }
    };
}
