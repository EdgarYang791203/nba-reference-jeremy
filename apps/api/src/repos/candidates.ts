import { and, eq, inArray } from 'drizzle-orm';
import { schema } from '@nba/shared';
import type { Db } from './db';

export type CandidateRow = typeof schema.runCandidates.$inferSelect;
export type CandidateInsert = typeof schema.runCandidates.$inferInsert;

export function createCandidatesRepo(db: Db) {
    return {
        async insertMany(rows: CandidateInsert[]): Promise<CandidateRow[]> {
            if (!rows.length) {
                return [];
            }
            return db.insert(schema.runCandidates).values(rows).returning();
        },

        listByRun(runDate: string): Promise<CandidateRow[]> {
            return db.select().from(schema.runCandidates).where(eq(schema.runCandidates.runDate, runDate));
        },

        listSelected(runDate: string): Promise<CandidateRow[]> {
            return db
                .select()
                .from(schema.runCandidates)
                .where(and(eq(schema.runCandidates.runDate, runDate), eq(schema.runCandidates.selected, true)));
        },

        async deleteByRun(runDate: string): Promise<void> {
            await db.delete(schema.runCandidates).where(eq(schema.runCandidates.runDate, runDate));
        },

        /** 標記已選取並寫入 customId（`${date}:${id}`），狀態 submitted */
        async markSelected(items: Array<{ id: number; customId: string; score: number }>): Promise<void> {
            for (const item of items) {
                await db
                    .update(schema.runCandidates)
                    .set({ selected: true, customId: item.customId, score: item.score, status: 'submitted' })
                    .where(eq(schema.runCandidates.id, item.id));
            }
        },

        async patch(id: number, partial: Partial<Omit<CandidateInsert, 'id'>>): Promise<void> {
            await db.update(schema.runCandidates).set(partial).where(eq(schema.runCandidates.id, id));
        },

        async patchMany(ids: number[], partial: Partial<Omit<CandidateInsert, 'id'>>): Promise<void> {
            if (!ids.length) {
                return;
            }
            await db.update(schema.runCandidates).set(partial).where(inArray(schema.runCandidates.id, ids));
        }
    };
}
