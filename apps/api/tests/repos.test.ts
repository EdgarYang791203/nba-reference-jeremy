import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepos, type Repos } from '../src/repos';
import { createTestDb, resetDb, type TestDb } from './helpers/db';

let testDb: TestDb;
let repos: Repos;

beforeAll(async () => {
    testDb = await createTestDb();
    repos = createRepos(testDb.db);
});

afterAll(async () => {
    await testDb.close();
});

beforeEach(async () => {
    await resetDb(testDb.db);
});

const lebron = { name: 'LeBron James', team: 'LAL', birthDate: '1984-12-30', season: 2026 };
const curry = { name: 'Stephen Curry', team: 'GSW', birthDate: '1988-03-14', season: 2026 };

describe('players repo', () => {
    it('upsertByNameTeam 冪等：第二次為 updated 不新增', async () => {
        const first = await repos.players.upsertByNameTeam([lebron, curry]);
        expect(first).toEqual({ inserted: 2, updated: 0 });

        await new Promise((r) => setTimeout(r, 1100));
        const second = await repos.players.upsertByNameTeam([{ ...lebron, season: 2027 }]);
        expect(second.updated).toBe(1);
        expect(second.inserted).toBe(0);

        const all = await repos.players.listAll();
        expect(all).toHaveLength(2);
        expect(all.find((p) => p.name === 'LeBron James')?.season).toBe(2027);
    });

    it('listActive 排除 active=false', async () => {
        await repos.players.upsertByNameTeam([lebron, curry]);
        const [row] = await repos.players.listAll();
        await repos.players.setActive(row.id, false);
        expect(await repos.players.listActive()).toHaveLength(1);
    });
});

describe('banlist repo', () => {
    it('add / idSet / remove', async () => {
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();
        await repos.banlist.add(p.id, 'test', 'hank@example.com');
        expect((await repos.banlist.idSet()).has(p.id)).toBe(true);
        expect(await repos.banlist.remove(p.id)).toBe(true);
        expect(await repos.banlist.remove(p.id)).toBe(false);
    });
});

describe('materials repo', () => {
    it('insertMany 忽略重複 sourceUrl；list 預設只列 published 且分頁', async () => {
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();
        const base = { playerId: p.id, date: '2026-09-28', titleZh: 't', summaryZh: 's', sourceName: 'ESPN' };
        const inserted = await repos.materials.insertMany([
            { ...base, sourceUrl: 'https://a/1' },
            { ...base, sourceUrl: 'https://a/2' },
            { ...base, sourceUrl: 'https://a/1' }
        ]);
        expect(inserted).toHaveLength(2);

        await repos.materials.setStatus(inserted[0].id, 'hidden');
        const page = await repos.materials.list({ pageSize: 10 });
        expect(page.total).toBe(1);
        expect(page.items[0].sourceUrl).toBe('https://a/2');

        const all = await repos.materials.list({ status: 'all' });
        expect(all.total).toBe(2);

        const bySource = await repos.materials.list({ source: 'CBS' });
        expect(bySource.total).toBe(0);
    });
});

describe('runs / candidates repo', () => {
    it('runs upsert 與 patch', async () => {
        await repos.runs.upsert({ date: '2026-09-28', status: 'pending', startedAt: new Date() });
        await repos.runs.patch('2026-09-28', { status: 'done', generatedCount: 3 });
        const run = await repos.runs.get('2026-09-28');
        expect(run?.status).toBe('done');
        expect(run?.generatedCount).toBe(3);
    });

    it('candidates markSelected 寫入 customId', async () => {
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();
        await repos.runs.upsert({ date: '2026-09-28', status: 'fetching' });
        const [c] = await repos.candidates.insertMany([
            { runDate: '2026-09-28', playerId: p.id, sourceUrl: 'https://a/1', title: 'x' }
        ]);
        await repos.candidates.markSelected([{ id: c.id, customId: '2026-09-28:1', score: 8 }]);
        const selected = await repos.candidates.listSelected('2026-09-28');
        expect(selected).toHaveLength(1);
        expect(selected[0].customId).toBe('2026-09-28:1');
        expect(selected[0].status).toBe('submitted');
    });
});

describe('usage / config repo', () => {
    it('sumCostForDate 與 sumCostSince(interactiveOnly)', async () => {
        await repos.usage.insertMany([
            { date: '2026-09-28', actor: 'scheduler', model: 'm', costUsd: 0.1 },
            { date: '2026-09-28', actor: 'hank@example.com', model: 'm', costUsd: 0.2 },
            { date: '2026-09-20', actor: 'hank@example.com', model: 'm', costUsd: 0.5 }
        ]);
        expect(await repos.usage.sumCostForDate('2026-09-28')).toBeCloseTo(0.3, 6);
        expect(await repos.usage.sumCostSince('2026-09-21', { interactiveOnly: true })).toBeCloseTo(0.2, 6);
        expect(await repos.usage.sumCostSince('2026-09-01')).toBeCloseTo(0.8, 6);
    });

    it('config set / getAll', async () => {
        await repos.config.set('dailyLimit', 5);
        await repos.config.set('killSwitch', true);
        await repos.config.set('killSwitch', false);
        expect(await repos.config.getAll()).toEqual({ dailyLimit: 5, killSwitch: false });
    });
});
