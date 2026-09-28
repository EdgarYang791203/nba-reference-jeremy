import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '@nba/shared';
import { createTestDb, resetDb, type TestDb } from './helpers/db';

let testDb: TestDb;

beforeAll(async () => {
    testDb = await createTestDb();
});

afterAll(async () => {
    await testDb.close();
});

beforeEach(async () => {
    await resetDb(testDb.db);
});

describe('pglite + migration', () => {
    it('players insert / select', async () => {
        const [row] = await testDb.db
            .insert(schema.players)
            .values({ name: 'LeBron James', team: 'LAL', birthDate: '1984-12-30', season: 2026 })
            .returning();
        expect(row.id).toBe(1);
        expect(row.active).toBe(true);
        expect(row.source).toBe('seed');
    });

    it('players(name, team) 唯一', async () => {
        const values = { name: 'LeBron James', team: 'LAL', birthDate: '1984-12-30', season: 2026 };
        await testDb.db.insert(schema.players).values(values);
        await expect(testDb.db.insert(schema.players).values(values)).rejects.toThrow();
    });

    it('materials.sourceUrl 唯一，jsonb 欄位往返', async () => {
        const [player] = await testDb.db
            .insert(schema.players)
            .values({ name: 'Stephen Curry', team: 'GSW', birthDate: '1988-03-14', season: 2026 })
            .returning();
        const material = {
            playerId: player.id,
            date: '2026-09-28',
            sourceUrl: 'https://example.com/a',
            titleZh: '標題',
            summaryZh: '摘要',
            keyQuotes: ['quote'],
            tags: ['warriors', 'curry']
        };
        const [inserted] = await testDb.db.insert(schema.materials).values(material).returning();
        expect(inserted.keyQuotes).toEqual(['quote']);
        expect(inserted.tags).toEqual(['warriors', 'curry']);
        await expect(testDb.db.insert(schema.materials).values(material)).rejects.toThrow();
    });

    it('run_candidates FK 指向 runs.date', async () => {
        await expect(
            testDb.db.insert(schema.runCandidates).values({
                runDate: '2026-09-28',
                playerId: 1,
                sourceUrl: 'https://example.com/x',
                title: 't'
            })
        ).rejects.toThrow();
    });
});
