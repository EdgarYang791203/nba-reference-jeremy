import { Hono } from 'hono';
import { z } from 'zod';
import type { Services } from '../deps';
import type { Env } from '../env';
import { requireAccess } from '../auth/access';
import { ok, parseBody, parseOrThrow } from './validate';

const banBodySchema = z.object({
    playerId: z.number().int().positive(),
    reason: z.string().max(500).optional()
});

const statusBodySchema = z.object({
    status: z.enum(['published', 'hidden'])
});

/** 受保護 API（計畫書 4.7）：Cloudflare Access（M4 前為 stub）。 */
export function adminRoutes(getServices: () => Services, env: Env) {
    const app = new Hono<{ Variables: { actor: string } }>();
    app.use('*', requireAccess(env));

    app.get('/banlist', async (c) => ok(c, await getServices().banlist.list()));

    app.post('/banlist', async (c) => {
        const body = await parseBody(c, banBodySchema);
        const row = await getServices().banlist.add(body.playerId, body.reason ?? null, c.get('actor'));
        return ok(c, row, 201);
    });

    app.delete('/banlist/:playerId', async (c) => {
        const playerId = parseOrThrow(z.coerce.number().int().positive(), c.req.param('playerId'));
        await getServices().banlist.remove(playerId);
        return ok(c, { playerId });
    });

    app.patch('/materials/:id', async (c) => {
        const id = parseOrThrow(z.coerce.number().int().positive(), c.req.param('id'));
        const body = await parseBody(c, statusBodySchema);
        return ok(c, await getServices().materials.setStatus(id, body.status));
    });

    return app;
}
