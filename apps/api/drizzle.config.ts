import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// 本地 db:generate / db:migrate 讀 apps/api/.env 或根目錄 .env（同 src/load-env.ts；drizzle-kit 不走 src）
const envFile = ['.env', '../../.env'].find((f) => existsSync(f));
if (envFile) {
    process.loadEnvFile(envFile);
}

export default defineConfig({
    schema: '../../packages/shared/src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL ?? ''
    }
});
