import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedPlayers } from '../scripts/seed';
import { createRepos } from '../src/repos';
import { createTestDb, resetDb, type TestDb } from './helpers/db';

const SEED = resolve(dirname(fileURLToPath(import.meta.url)), '../../../seed/players-2026.json');

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

describe('seed', () => {
    it('第一次全插入，第二次全更新（冪等）', async () => {
        const first = await seedPlayers(testDb.db, SEED);
        expect(first.inserted).toBe(first.total);
        expect(first.updated).toBe(0);

        await new Promise((r) => setTimeout(r, 1100));
        const second = await seedPlayers(testDb.db, SEED);
        expect(second.inserted).toBe(0);
        expect(second.updated).toBe(first.total);

        const all = await createRepos(testDb.db).players.listAll();
        expect(all).toHaveLength(first.total);
        expect(all.every((p) => p.source === 'seed' && p.season === 2026)).toBe(true);
    });
});
