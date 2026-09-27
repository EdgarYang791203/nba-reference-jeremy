import { Hono } from 'hono';
import { publicRoutes } from './routes/public';

/** 組合 app 的工廠，測試以 app.request() 直接打（計畫書 7）。 */
export function createApp() {
    const app = new Hono();

    app.get('/health', (c) => c.json({ ok: true, service: 'nba-api' }));

    app.route('/api', publicRoutes);

    // 之後掛載（對應章節）：
    // - 受保護路由：/api/banlist、PATCH /api/materials/:id（4.7，Access JWT）
    // - 排程路由：/jobs/daily、/jobs/daily/collect、/jobs/roster（4.4、4.5，Scheduler OIDC）

    return app;
}
