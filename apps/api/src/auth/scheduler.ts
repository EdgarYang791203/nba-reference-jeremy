/**
 * Cloud Scheduler OIDC 驗證（計畫書 5、9C.1 A3）。
 * TODO(M4): 以 google-auth-library 驗 JWT：Google 簽章、iss=accounts.google.com、aud=Cloud Run URL、email=指定 SA。
 * 目前為 stub：production 一律 401；其他環境放行並設 actor='scheduler'。
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env';

export function requireScheduler(env: Env): MiddlewareHandler<{ Variables: { actor: string } }> {
    return async (c, next) => {
        if (env.NODE_ENV === 'production') {
            // TODO(M4): 驗證通過才放行
            return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'scheduler auth not implemented' } }, 401);
        }
        c.set('actor', 'scheduler');
        await next();
    };
}
