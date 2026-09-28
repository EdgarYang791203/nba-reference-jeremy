/**
 * 站台 config（計畫書 4.3 `config` 表 + 9C.4 D3）：所有上限、模型名稱、費率由此讀，
 * DB 缺的 key 用這裡的預設值。api 的 config service 以 60s 快取合併 DB rows 後經此 schema 驗證。
 */
import { z } from 'zod';

export const modelRateSchema = z.object({
    /** USD / 百萬 tokens */
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
    cacheRead: z.number().nonnegative(),
    cacheWrite: z.number().nonnegative()
});
export type ModelRate = z.infer<typeof modelRateSchema>;

export const rssSourceSchema = z.object({
    name: z.string().min(1),
    url: z.string().url()
});
export type RssSource = z.infer<typeof rssSourceSchema>;

/** 固定 RSS（4.4 步驟 3）。TODO(討論): 實際 feed URL 需驗證可用性 */
export const DEFAULT_SOURCES: RssSource[] = [
    { name: 'ESPN', url: 'https://www.espn.com/espn/rss/nba/news' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/nba/' },
    { name: 'HoopsHype', url: 'https://hoopshype.com/feed/' },
    { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/nba/rss/' }
];

export const appConfigSchema = z.object({
    // ── 素材產出上限（4.2） ──
    dailyLimit: z.number().int().positive().default(20),
    perPlayerLimit: z.number().int().positive().default(2),
    minAge: z.number().int().positive().default(30),
    /** 階段 A score = value + focus，低於此不取（4.5.1） */
    minScore: z.number().int().nonnegative().default(6),
    seasonOpening: z
        .object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) })
        .default({ month: 10, day: 21 }),

    // ── 來源與擷取（4.4） ──
    sources: z.array(rssSourceSchema).default(DEFAULT_SOURCES),
    freshnessHours: z.number().positive().default(36),
    /** 原文截斷（≈ 6,000 tokens，4.5.1 階段 B） */
    articleMaxChars: z.number().int().positive().default(24_000),
    stageAChunkSize: z.number().int().positive().default(150),

    // ── 模型與費率（4.5.1 / 4.5.2） ──
    models: z
        .object({
            stageA: z.string().min(1),
            stageB: z.string().min(1),
            interactive: z.string().min(1)
        })
        .default({
            stageA: 'claude-haiku-4-5',
            stageB: 'claude-haiku-4-5',
            interactive: 'claude-sonnet-4-5'
        }),
    rates: z.record(z.string(), modelRateSchema).default({
        'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
        'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }
    }),
    batchDiscount: z.number().min(0).max(1).default(0.5),

    // ── 帳單防護（6.1 / 9C.4） ──
    /** 規格 4.5.2 為 1.0、6.1 為 1.5；先用 1.0，PR 提出 */
    dailyBudgetUsd: z.number().nonnegative().default(1.0),
    weeklyInteractiveBudgetUsd: z.number().nonnegative().default(2),
    monthlyInteractiveBudgetUsd: z.number().nonnegative().default(8.5),
    killSwitch: z.boolean().default(false),

    // ── 排程（4.4 / 4.5.1） ──
    batchTimeoutHours: z.number().positive().default(24),
    /** 進行中的 run 超過此分鐘數無更新視為 crash，可重跑 */
    staleRunMinutes: z.number().positive().default(30),

    // ── 平台 ──
    corsOrigins: z.array(z.string()).default([])
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const DEFAULT_CONFIG: AppConfig = appConfigSchema.parse({});
