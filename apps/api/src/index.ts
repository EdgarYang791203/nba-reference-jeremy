import { serve } from '@hono/node-server';
import { createApp } from './app';
import { readEnv } from './env';
import { resolveDbFromEnv } from './repos/db';

const env = readEnv();

async function main() {
    // DATABASE_URL 為 pglite:// 時（本地無 Neon）先套 migration；Neon 則 lazy 連線
    const db = env.DATABASE_URL ? await resolveDbFromEnv(env.DATABASE_URL) : undefined;
    const app = createApp({ env, db });

    serve({ fetch: app.fetch, port: env.PORT }, (info) => {
        console.log(`nba-api listening on :${info.port} (db: ${env.DATABASE_URL?.split('://')[0] ?? 'none'}, llm: ${env.LLM_PROVIDER ?? 'mock'})`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
