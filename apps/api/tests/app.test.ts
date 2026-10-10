import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('app（無 DB）', () => {
    it('GET /health 回 200，不需要 DATABASE_URL', async () => {
        const res = await createApp({ env: { NODE_ENV: 'test', PORT: 0 } }).request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, service: 'nba-api' });
    });

    it('未知路由回 404 envelope', async () => {
        const res = await createApp({ env: { NODE_ENV: 'test', PORT: 0 } }).request('/nope');
        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    });
});
