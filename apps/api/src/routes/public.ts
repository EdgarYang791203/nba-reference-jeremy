import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../deps';
import { ok, parseOrThrow } from './validate';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

const materialsQuerySchema = z.object({
    playerId: z.coerce.number().int().positive().optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    source: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1)
});

const playersQuerySchema = z.object({
    eligible: z
        .enum(['true', 'false'])
        .default('true')
        .transform((v) => v === 'true')
});

/** 公開 API（計畫書 4.6）。routes 只做驗證與呼叫 service。 */
export function publicRoutes(getServices: () => Services) {
    const app = new Hono();

    app.get('/materials', async (c) => {
        const query = parseOrThrow(materialsQuerySchema, c.req.query());
        // TODO(討論): pageSize 固定 20
        return ok(c, await getServices().materials.list({ ...query, pageSize: 20 }));
    });

    app.get('/materials/:id', async (c) => {
        const id = parseOrThrow(z.coerce.number().int().positive(), c.req.param('id'));
        return ok(c, await getServices().materials.get(id));
    });

    app.get('/players', async (c) => {
        const { eligible } = parseOrThrow(playersQuerySchema, c.req.query());
        const services = getServices();
        if (!eligible) {
            return ok(c, await services.repos.players.listActive());
        }
        const config = await services.configService.get();
        return ok(c, await services.players.listEligible(config, new Date()));
    });

    return app;
}
