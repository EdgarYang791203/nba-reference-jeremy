import { Hono } from 'hono';

/** 公開 API（計畫書 4.6）。routes 層只做驗證與呼叫 service，不含業務邏輯。 */
export const publicRoutes = new Hono();

publicRoutes.get('/materials', (c) =>
    c.json({ error: 'not implemented' }, 501)
);

publicRoutes.get('/materials/:id', (c) =>
    c.json({ error: 'not implemented' }, 501)
);

publicRoutes.get('/players', (c) =>
    c.json({ error: 'not implemented' }, 501)
);
