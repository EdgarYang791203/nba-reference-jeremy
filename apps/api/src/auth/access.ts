/**
 * Cloudflare Access JWT 驗證（計畫書 5、9C.1 A2）。
 * TODO(M4): 驗 `Cf-Access-Jwt-Assertion`（Cloudflare 公鑰、aud、iss）+ email 白名單，actor 取 JWT email。
 * 目前為 stub：production 一律 401；其他環境放行並設 actor='dev@local'。
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env';

export function requireAccess(env: Env): MiddlewareHandler<{ Variables: { actor: string } }> {
    return async (c, next) => {
        if (env.NODE_ENV === 'production') {
            // TODO(M4): 驗證通過才放行
            return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'access auth not implemented' } }, 401);
        }
        c.set('actor', 'dev@local');
        await next();
    };
}
