/**
 * 本地開發載入 apps/api/.env（計畫書 5：本地 .env 進 .gitignore，只放 .env.example）。
 * 用 Node 內建 process.loadEnvFile，不加套件；檔案不存在（CI、Cloud Run）直接略過，
 * 已存在的環境變數不會被覆蓋。須在任何讀 process.env 的模組之前 import。
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// 先找 apps/api/.env，再找 repo 根目錄 .env（.env.example 在根目錄）
const candidates = [resolve(here, '../.env'), resolve(here, '../../../.env')];

for (const envFile of candidates) {
    if (!existsSync(envFile)) {
        continue;
    }
    try {
        process.loadEnvFile(envFile);
    } catch (error) {
        console.warn(`[env] 無法載入 ${envFile}: ${(error as Error).message}`);
    }
    break;
}
