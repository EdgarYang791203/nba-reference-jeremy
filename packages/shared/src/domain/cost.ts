/** LLM 費用計算（計畫書 4.5.2）：費率為 USD / 百萬 tokens；Batch 折扣可與 cache 折扣疊加。 */
import type { ModelRate } from '../config/schema';

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
}

export const EMPTY_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0 };

export function computeCostUsd(
    usage: TokenUsage,
    rate: ModelRate,
    options: { batch?: boolean; batchDiscount?: number } = {}
): number {
    const perMillion =
        usage.inputTokens * rate.input +
        usage.outputTokens * rate.output +
        usage.cacheRead * rate.cacheRead +
        usage.cacheWrite * rate.cacheWrite;
    const discount = options.batch ? (options.batchDiscount ?? 0.5) : 1;
    // 保留 6 位小數，避免浮點雜訊累積到 usage_log
    return Math.round((perMillion / 1_000_000) * discount * 1e6) / 1e6;
}

export function sumUsage(items: TokenUsage[]): TokenUsage {
    return items.reduce(
        (acc, u) => ({
            inputTokens: acc.inputTokens + u.inputTokens,
            outputTokens: acc.outputTokens + u.outputTokens,
            cacheRead: acc.cacheRead + u.cacheRead,
            cacheWrite: acc.cacheWrite + u.cacheWrite
        }),
        { ...EMPTY_USAGE }
    );
}
