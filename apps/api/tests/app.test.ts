import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('app', () => {
    it('GET /health 回 200', async () => {
        const res = await createApp().request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, service: 'nba-api' });
    });

    it('公開 API 骨架已掛載（未實作回 501）', async () => {
        const res = await createApp().request('/api/materials');
        expect(res.status).toBe(501);
    });
});
