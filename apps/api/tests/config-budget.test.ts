import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepos, type Repos } from '../src/repos';
import { createConfigService } from '../src/services/config';
import { createBudgetGuard } from '../src/services/budget';
import { BudgetExceededError, KillSwitchError } from '../src/services/errors';
import { createTestDb, resetDb, type TestDb } from './helpers/db';

let testDb: TestDb;
let repos: Repos;

// 2026-09-28 週一 10:00 台北
const NOW = new Date('2026-09-28T02:00:00Z');

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

describe('config service', () => {
    it('合併 DB rows 與預設；60s 內快取、invalidate 後重讀', async () => {
        let clock = NOW.getTime();
        const service = createConfigService({ configRepo: repos.config, now: () => new Date(clock) });

        await repos.config.set('dailyLimit', 7);
        expect((await service.get()).dailyLimit).toBe(7);
        expect((await service.get()).perPlayerLimit).toBe(2);

        await repos.config.set('dailyLimit', 9);
        clock += 30_000;
        expect((await service.get()).dailyLimit).toBe(7); // 仍快取

        clock += 31_000;
        expect((await service.get()).dailyLimit).toBe(9); // 過期重讀

        await repos.config.set('dailyLimit', 11);
        service.invalidate();
        expect((await service.get()).dailyLimit).toBe(11);
    });

    it('DB 壞值退回預設，其他 key 保留', async () => {
        const warnings: string[] = [];
        const service = createConfigService({
            configRepo: repos.config,
            now: () => NOW,
            logger: { warn: (m: string) => warnings.push(m) }
        });
        await repos.config.set('dailyLimit', 'not-a-number');
        await repos.config.set('perPlayerLimit', 3);
        const config = await service.get();
        expect(config.dailyLimit).toBe(20);
        expect(config.perPlayerLimit).toBe(3);
        expect(warnings.join()).toContain('dailyLimit');
    });
});

describe('BudgetGuard', () => {
    function guard(overrides: Record<string, unknown> = {}) {
        const configService = createConfigService({ configRepo: repos.config, now: () => NOW, ttlMs: 0 });
        const promise = Promise.all(Object.entries(overrides).map(([k, v]) => repos.config.set(k, v)));
        return { guard: createBudgetGuard({ usageRepo: repos.usage, configService, now: () => NOW }), ready: promise };
    }

    it('killSwitch 一律拒絕', async () => {
        const { guard: g, ready } = guard({ killSwitch: true });
        await ready;
        await expect(g.assertAllowed({ actor: 'scheduler', kind: 'scheduler', estimatedCostUsd: 0 })).rejects.toBeInstanceOf(
            KillSwitchError
        );
    });

    it('daily 邊界：spent + est == limit 允許，> limit 拒絕', async () => {
        const { guard: g, ready } = guard({ dailyBudgetUsd: 1.0 });
        await ready;
        await repos.usage.insert({ date: '2026-09-28', actor: 'scheduler', model: 'm', costUsd: 0.5 });

        await expect(g.assertAllowed({ actor: 'scheduler', kind: 'scheduler', estimatedCostUsd: 0.5 })).resolves.toBeUndefined();
        await expect(g.assertAllowed({ actor: 'scheduler', kind: 'scheduler', estimatedCostUsd: 0.51 })).rejects.toBeInstanceOf(
            BudgetExceededError
        );
    });

    it('互動額度：週上限只算非 scheduler 的 usage', async () => {
        const { guard: g, ready } = guard({ weeklyInteractiveBudgetUsd: 1.0, dailyBudgetUsd: 100 });
        await ready;
        await repos.usage.insertMany([
            { date: '2026-09-27', actor: 'scheduler', model: 'm', costUsd: 5 }, // 上週且是排程，不計
            { date: '2026-09-28', actor: 'hank@example.com', model: 'm', costUsd: 0.9 }
        ]);
        await expect(g.assertAllowed({ actor: 'hank@example.com', kind: 'interactive', estimatedCostUsd: 0.1 })).resolves.toBeUndefined();
        await expect(g.assertAllowed({ actor: 'hank@example.com', kind: 'interactive', estimatedCostUsd: 0.2 })).rejects.toMatchObject({
            details: { scope: 'weeklyInteractive' }
        });
        // 排程不受週上限影響
        await expect(g.assertAllowed({ actor: 'scheduler', kind: 'scheduler', estimatedCostUsd: 0.2 })).resolves.toBeUndefined();
    });

    it('snapshot 回傳各上限與已用', async () => {
        const { guard: g, ready } = guard();
        await ready;
        await repos.usage.insert({ date: '2026-09-28', actor: 'scheduler', model: 'm', costUsd: 0.25 });
        const snap = await g.snapshot();
        expect(snap.daily).toEqual({ spent: 0.25, limit: 1.0 });
        expect(snap.killSwitch).toBe(false);
    });
});
