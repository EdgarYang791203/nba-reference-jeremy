import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, appConfigSchema } from '../src/config/schema';
import { computeCostUsd, sumUsage } from '../src/domain/cost';
import { taipeiDate, taipeiMonthStart, taipeiWeekStart } from '../src/domain/dates';

const haiku = DEFAULT_CONFIG.rates['claude-haiku-4-5'];

describe('computeCostUsd（以 4.5.2 估算為 oracle）', () => {
    it('階段 A 同步：45k in / 5k out ≈ $0.07', () => {
        const cost = computeCostUsd(
            { inputTokens: 45_000, outputTokens: 5_000, cacheRead: 0, cacheWrite: 0 },
            haiku
        );
        expect(cost).toBeCloseTo(0.07, 3);
    });

    it('階段 B Batch：80k in / 16k out 打 5 折 ≈ $0.08', () => {
        const cost = computeCostUsd(
            { inputTokens: 80_000, outputTokens: 16_000, cacheRead: 0, cacheWrite: 0 },
            haiku,
            { batch: true }
        );
        expect(cost).toBeCloseTo(0.08, 3);
    });

    it('cache 讀取以 input 10% 計，且可與 batch 疊加', () => {
        const usage = { inputTokens: 0, outputTokens: 0, cacheRead: 1_000_000, cacheWrite: 0 };
        expect(computeCostUsd(usage, haiku)).toBeCloseTo(0.1, 6);
        expect(computeCostUsd(usage, haiku, { batch: true })).toBeCloseTo(0.05, 6);
    });

    it('sumUsage 逐欄相加', () => {
        expect(
            sumUsage([
                { inputTokens: 1, outputTokens: 2, cacheRead: 3, cacheWrite: 4 },
                { inputTokens: 10, outputTokens: 20, cacheRead: 30, cacheWrite: 40 }
            ])
        ).toEqual({ inputTokens: 11, outputTokens: 22, cacheRead: 33, cacheWrite: 44 });
    });
});

describe('appConfigSchema', () => {
    it('空物件套全部預設值', () => {
        expect(DEFAULT_CONFIG.dailyLimit).toBe(20);
        expect(DEFAULT_CONFIG.killSwitch).toBe(false);
        expect(DEFAULT_CONFIG.sources.length).toBeGreaterThan(0);
    });

    it('拒絕不合法值', () => {
        expect(appConfigSchema.safeParse({ dailyLimit: -1 }).success).toBe(false);
        expect(appConfigSchema.safeParse({ batchDiscount: 2 }).success).toBe(false);
    });
});

describe('taipei dates', () => {
    it('UTC 午夜前後跨日以台北為準', () => {
        // 2026-09-28T17:00Z = 台北 09/29 01:00
        expect(taipeiDate(new Date('2026-09-28T17:00:00Z'))).toBe('2026-09-29');
        expect(taipeiDate(new Date('2026-09-28T15:59:00Z'))).toBe('2026-09-28');
    });

    it('週起算日為台北週一', () => {
        // 2026-09-28 是週一（台北）；09/27 週日 23:00 台北 = 09/27T15:00Z
        expect(taipeiWeekStart(new Date('2026-09-28T00:00:00Z'))).toBe('2026-09-28');
        expect(taipeiWeekStart(new Date('2026-09-27T15:00:00Z'))).toBe('2026-09-21');
        expect(taipeiWeekStart(new Date('2026-10-03T10:00:00Z'))).toBe('2026-09-28');
    });

    it('月初', () => {
        expect(taipeiMonthStart(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10-01');
    });
});
