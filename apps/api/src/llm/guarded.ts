/**
 * Guarded LLM client（9C.4 D1 / D2 / D4）：
 * - 每次 complete / submitBatch 先過 BudgetGuard（含 killSwitch）
 * - complete 完成後必寫一筆 usage_log（tokens、cache、costUsd）
 * - batch 的 usage 於 collect 階段以 logBatchUsage 逐筆寫入（Batch 費率）
 * ⚠ 12.4：不得修改或繞過。
 */
import { computeCostUsd, taipeiDate, type AppConfig } from '@nba/shared';
import type { Repos } from '../repos';
import type { BudgetGuard } from '../services/budget';
import type { ConfigService } from '../services/config';
import type { BatchRequestItem, CompleteParams, LlmClient, LlmProvider, LlmUsage } from './types';

/** 呼叫前的粗估：input ≈ 字元/4，output ≈ maxTokens 的一半 */
export function estimateCostUsd(params: CompleteParams, config: AppConfig, batch = false): number {
    const rate = config.rates[params.model];
    if (!rate) {
        return 0;
    }
    const usage: LlmUsage = {
        inputTokens: Math.ceil((params.system.length + params.user.length) / 4),
        outputTokens: Math.ceil(params.maxTokens / 2),
        cacheRead: 0,
        cacheWrite: 0
    };
    return computeCostUsd(usage, rate, { batch, batchDiscount: config.batchDiscount });
}

export function withGuard(
    provider: LlmProvider,
    deps: { budgetGuard: BudgetGuard; usageRepo: Repos['usage']; configService: ConfigService; now: () => Date }
): LlmClient {
    async function record(actor: string, model: string, usage: LlmUsage, batch: boolean) {
        const config = await deps.configService.get();
        const rate = config.rates[model];
        const costUsd = rate ? computeCostUsd(usage, rate, { batch, batchDiscount: config.batchDiscount }) : 0;
        await deps.usageRepo.insert({
            date: taipeiDate(deps.now()),
            actor,
            model,
            tokensIn: usage.inputTokens,
            tokensOut: usage.outputTokens,
            cacheRead: usage.cacheRead,
            cacheWrite: usage.cacheWrite,
            costUsd
        });
    }

    return {
        name: provider.name,

        async complete(req) {
            const config = await deps.configService.get();
            await deps.budgetGuard.assertAllowed({
                actor: req.actor,
                kind: req.kind,
                estimatedCostUsd: estimateCostUsd(req, config)
            });
            const result = await provider.complete(req);
            await record(req.actor, req.model, result.usage, false);
            return result;
        },

        async submitBatch(req) {
            const config = await deps.configService.get();
            const estimated = req.items.reduce(
                (sum: number, item: BatchRequestItem) => sum + estimateCostUsd(item.params, config, true),
                0
            );
            await deps.budgetGuard.assertAllowed({ actor: req.actor, kind: req.kind, estimatedCostUsd: estimated });
            return provider.submitBatch(req);
        },

        getBatch: (batchId) => provider.getBatch(batchId),
        getBatchResults: (batchId) => provider.getBatchResults(batchId),
        cancelBatch: (batchId) => provider.cancelBatch(batchId),

        async logBatchUsage(meta, model, items) {
            for (const item of items) {
                if (item.type === 'succeeded') {
                    await record(meta.actor, model, item.usage, true);
                }
            }
        }
    };
}
