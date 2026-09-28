import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { createServices, resolveDeps, type AppDeps, type Services } from './deps';
import { readEnv } from './env';
import { AppError } from './services/errors';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';
import { jobRoutes } from './routes/jobs';

/**
 * 組合 app 的工廠。deps 可部分注入（測試：pglite db、mock llm、fake fetch、固定 now）。
 * services 延遲建立：GET /health 不需要 DB。
 */
export function createApp(partialDeps: Partial<AppDeps> = {}) {
    const app = new Hono();
    let deps: AppDeps | null = null;
    let services: Services | null = null;

    // env 先讀（不觸發 DB 連線）；db 等到第一個需要 services 的請求才解析
    const env = partialDeps.env ?? readEnv();
    const getDeps = () => (deps ??= resolveDeps({ ...partialDeps, env }));
    const getServices = () => (services ??= createServices(getDeps()));

    app.onError((error, c) => {
        if (error instanceof AppError) {
            return c.json({ ok: false, error: { code: error.code, message: error.message, issues: error.details } }, error.status as 400);
        }
        if (error instanceof ZodError) {
            return c.json({ ok: false, error: { code: 'VALIDATION', message: 'invalid request', issues: error.issues } }, 400);
        }
        (partialDeps.logger ?? console).error(error);
        return c.json({ ok: false, error: { code: 'INTERNAL', message: 'internal error' } }, 500);
    });

    // CORS 白名單只放前端網域（計畫書 5）；本地 dev 前端走 devProxy 不需要
    app.use(
        '/api/*',
        cors({
            origin: (origin) => {
                const allowed = env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [];
                // TODO(M4): 從 config.corsOrigins 讀取（需要 async；hono cors origin 為同步）
                return allowed.includes(origin) ? origin : null;
            }
        })
    );

    app.get('/health', (c) => c.json({ ok: true, service: 'nba-api' }));

    app.route('/api', publicRoutes(getServices));
    app.route('/api', adminRoutes(getServices, env));
    app.route('/jobs', jobRoutes(getServices, env));

    app.notFound((c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'route not found' } }, 404));

    return app;
}
