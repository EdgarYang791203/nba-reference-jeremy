import { Hono } from 'hono';
import { z } from 'zod';
import { taipeiDate } from '@nba/shared';
import type { Services } from '../deps';
import type { Env } from '../env';
import { requireScheduler } from '../auth/scheduler';
import { runDaily } from '../services/pipeline/daily';
import { runCollect } from '../services/pipeline/collect';
import { ok, parseOrThrow } from './validate';

const dateQuerySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
});

/**
 * 排程路由（計畫書 4.4 / 4.5）：Cloud Scheduler OIDC（M4 前為 stub）。
 * 失敗一律回 200 + status，避免 Scheduler 重試燒錢（9C.1 三層防護的損害限制）。
 */
export function jobRoutes(getServices: () => Services, env: Env) {
    const app = new Hono<{ Variables: { actor: string } }>();
    app.use('*', requireScheduler(env));

    app.post('/daily', async (c) => {
        const { date } = parseOrThrow(dateQuerySchema, c.req.query());
        const services = getServices();
        const ctx = await services.pipelineCtx();
        return ok(c, await runDaily(ctx, { date }));
    });

    app.post('/daily/collect', async (c) => {
        const { date } = parseOrThrow(dateQuerySchema, c.req.query());
        const services = getServices();
        const ctx = await services.pipelineCtx();
        return ok(c, await runCollect(ctx, { date: date ?? taipeiDate(ctx.now()) }));
    });

    // TODO(M8): 動態名單更新（NBA stats API → balldontlie fallback）
    app.post('/roster', (c) => c.json({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'roster job is milestone 8' } }, 501));

    return app;
}
