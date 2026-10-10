/**
 * config 服務（9C.4 D3）：DEFAULT_CONFIG ⊕ DB rows → zod 驗證 → 快取 60s。
 * DB 壞值不讓排程炸掉：該 key 退回預設並 console.warn。killSwitch 也走這裡，改 DB 60s 內生效（D4）。
 */
import { DEFAULT_CONFIG, appConfigSchema, type AppConfig } from '@nba/shared';
import type { Repos } from '../repos';

export interface ConfigServiceOptions {
    configRepo: Repos['config'];
    now: () => Date;
    ttlMs?: number;
    logger?: Pick<Console, 'warn'>;
}

export interface ConfigService {
    get(): Promise<AppConfig>;
    invalidate(): void;
}

export function createConfigService(options: ConfigServiceOptions): ConfigService {
    const ttlMs = options.ttlMs ?? 60_000;
    const logger = options.logger ?? console;
    let cached: AppConfig | null = null;
    let loadedAt = 0;

    async function load(): Promise<AppConfig> {
        const rows = await options.configRepo.getAll();
        const merged = { ...DEFAULT_CONFIG, ...rows };
        const parsed = appConfigSchema.safeParse(merged);
        if (parsed.success) {
            return parsed.data;
        }
        // 逐 key 剔除壞值後重試，保住其他設定
        const badKeys = new Set(parsed.error.issues.map((i) => String(i.path[0])));
        logger.warn(`[config] invalid values for ${[...badKeys].join(', ')}; falling back to defaults`);
        const cleaned: Record<string, unknown> = { ...merged };
        for (const key of badKeys) {
            delete cleaned[key];
        }
        return appConfigSchema.parse({ ...DEFAULT_CONFIG, ...cleaned });
    }

    return {
        async get() {
            const nowMs = options.now().getTime();
            if (cached && nowMs - loadedAt < ttlMs) {
                return cached;
            }
            cached = await load();
            loadedAt = nowMs;
            return cached;
        },
        invalidate() {
            cached = null;
            loadedAt = 0;
        }
    };
}
