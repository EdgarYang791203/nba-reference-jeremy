import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app';
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

const lebron = { name: 'LeBron James', team: 'LAL', birthDate: '1984-12-30', season: 2026 };
const rookie = { name: 'Young Guy', team: 'BOS', birthDate: '2005-01-01', season: 2026 };

async function json(res: Response) {
    return res.json() as Promise<{ ok: boolean; data?: unknown; error?: { code: string } }>;
}

describe('公開 API（4.6）', () => {
    it('GET /api/materials 分頁、playerId 篩選、hidden 排除', async () => {
        const { app, repos } = await createTestApp({ db: testDb.db });
        await repos.players.upsertByNameTeam([lebron, rookie]);
        const [p1, p2] = await repos.players.listAll();
        const base = { date: '2026-09-28', titleZh: 't', summaryZh: 's', sourceName: 'ESPN' };
        const rows = await repos.materials.insertMany([
            { ...base, playerId: p1.id, sourceUrl: 'https://a/1' },
            { ...base, playerId: p2.id, sourceUrl: 'https://a/2' },
            { ...base, playerId: p1.id, sourceUrl: 'https://a/3' }
        ]);
        await repos.materials.setStatus(rows[2].id, 'hidden');

        const all = await json(await app.request('/api/materials'));
        expect(all.ok).toBe(true);
        expect((all.data as { total: number; pageSize: number }).total).toBe(2);
        expect((all.data as { pageSize: number }).pageSize).toBe(20);

        const byPlayer = await json(await app.request(`/api/materials?playerId=${p1.id}`));
        expect((byPlayer.data as { total: number }).total).toBe(1);

        const bad = await app.request('/api/materials?playerId=abc');
        expect(bad.status).toBe(400);
        expect((await json(bad)).error?.code).toBe('VALIDATION');
    });

    it('GET /api/materials/:id：hidden 與不存在皆 404', async () => {
        const { app, repos } = await createTestApp({ db: testDb.db });
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();
        const [m] = await repos.materials.insertMany([{ playerId: p.id, date: '2026-09-28', sourceUrl: 'https://a/1', titleZh: 't', summaryZh: 's' }]);

        expect((await app.request(`/api/materials/${m.id}`)).status).toBe(200);
        expect((await app.request('/api/materials/999')).status).toBe(404);
        await repos.materials.setStatus(m.id, 'hidden');
        expect((await app.request(`/api/materials/${m.id}`)).status).toBe(404);
    });

    it('GET /api/players?eligible=true 依賽季基準日與 ban list', async () => {
        const { app, repos } = await createTestApp({ db: testDb.db });
        await repos.players.upsertByNameTeam([lebron, rookie, { name: 'Banned Vet', team: 'MIA', birthDate: '1989-09-14', season: 2026 }]);
        const banned = (await repos.players.listAll()).find((p) => p.name === 'Banned Vet')!;
        await repos.banlist.add(banned.id, 'test', 'test');

        const res = await json(await app.request('/api/players?eligible=true'));
        const names = (res.data as Array<{ name: string }>).map((p) => p.name);
        expect(names).toEqual(['LeBron James']);

        const all = await json(await app.request('/api/players?eligible=false'));
        expect((all.data as unknown[]).length).toBe(3);
    });
});

describe('受保護 API（4.7）', () => {
    it('POST /api/banlist：zod 400、不存在 404、成功 201；DELETE 冪等 404', async () => {
        const { app, repos } = await createTestApp({ db: testDb.db });
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();

        const bad = await app.request('/api/banlist', { method: 'POST', body: JSON.stringify({ playerId: 'x' }), headers: { 'content-type': 'application/json' } });
        expect(bad.status).toBe(400);

        const missing = await app.request('/api/banlist', { method: 'POST', body: JSON.stringify({ playerId: 999 }), headers: { 'content-type': 'application/json' } });
        expect(missing.status).toBe(404);

        const created = await app.request('/api/banlist', {
            method: 'POST',
            body: JSON.stringify({ playerId: p.id, reason: 'retired' }),
            headers: { 'content-type': 'application/json' }
        });
        expect(created.status).toBe(201);
        expect((await json(created)).data).toMatchObject({ playerId: p.id, bannedBy: 'dev@local' });
        expect((await repos.banlist.idSet()).has(p.id)).toBe(true);

        expect((await app.request(`/api/banlist/${p.id}`, { method: 'DELETE' })).status).toBe(200);
        expect((await app.request(`/api/banlist/${p.id}`, { method: 'DELETE' })).status).toBe(404);
    });

    it('PATCH /api/materials/:id hide / unhide；非法 status 400', async () => {
        const { app, repos } = await createTestApp({ db: testDb.db });
        await repos.players.upsertByNameTeam([lebron]);
        const [p] = await repos.players.listAll();
        const [m] = await repos.materials.insertMany([{ playerId: p.id, date: '2026-09-28', sourceUrl: 'https://a/1', titleZh: 't', summaryZh: 's' }]);

        const hidden = await app.request(`/api/materials/${m.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'hidden' }), headers: { 'content-type': 'application/json' } });
        expect(hidden.status).toBe(200);
        expect((await repos.materials.getById(m.id))?.status).toBe('hidden');

        const bad = await app.request(`/api/materials/${m.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'deleted' }), headers: { 'content-type': 'application/json' } });
        expect(bad.status).toBe(400);
    });

    it('production 環境：auth stub 回 401（M4 前不得放行）', async () => {
        const { app } = await createTestApp({ db: testDb.db, env: { NODE_ENV: 'production' } });
        expect((await app.request('/api/banlist', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })).status).toBe(401);
        expect((await app.request('/jobs/daily', { method: 'POST' })).status).toBe(401);
        // 公開 API 不受影響
        expect((await app.request('/api/materials')).status).toBe(200);
    });

    it('POST /jobs/roster 尚未實作 501', async () => {
        const { app } = await createTestApp({ db: testDb.db });
        expect((await app.request('/jobs/roster', { method: 'POST' })).status).toBe(501);
    });
});
