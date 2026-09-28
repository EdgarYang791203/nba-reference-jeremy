/**
 * BudgetGuard（9C.4 D2 / D4）：每次 Claude 呼叫前檢查
 * - killSwitch → 一律拒絕
 * - dailyBudgetUsd（全站，台北日）
 * - 互動（kind='interactive'）另檢查週（台北自然週）與月上限
 * 邊界：spent + estimated ≤ limit 允許；超過拒絕。
 * ⚠ 計畫書 12.4：不得修改或繞過此邏輯。
 */
import { taipeiDate, taipeiMonthStart, taipeiWeekStart } from '@nba/shared';
import type { Repos } from '../repos';
import type { ConfigService } from './config';
import { BudgetExceededError, KillSwitchError } from './errors';

export interface BudgetCheck {
    actor: string;
    kind: 'scheduler' | 'interactive';
    estimatedCostUsd: number;
}

export interface BudgetGuard {
    assertAllowed(check: BudgetCheck): Promise<void>;
    /** 供 /api/usage 顯示剩餘額度（9C.4 D7） */
    snapshot(): Promise<{
        killSwitch: boolean;
        daily: { spent: number; limit: number };
        weeklyInteractive: { spent: number; limit: number };
        monthlyInteractive: { spent: number; limit: number };
    }>;
}

export function createBudgetGuard(deps: {
    usageRepo: Repos['usage'];
    configService: ConfigService;
    now: () => Date;
}): BudgetGuard {
    async function snapshot() {
        const config = await deps.configService.get();
        const now = deps.now();
        const [daily, weekly, monthly] = await Promise.all([
            deps.usageRepo.sumCostForDate(taipeiDate(now)),
            deps.usageRepo.sumCostSince(taipeiWeekStart(now), { interactiveOnly: true }),
            deps.usageRepo.sumCostSince(taipeiMonthStart(now), { interactiveOnly: true })
        ]);
        return {
            killSwitch: config.killSwitch,
            daily: { spent: daily, limit: config.dailyBudgetUsd },
            weeklyInteractive: { spent: weekly, limit: config.weeklyInteractiveBudgetUsd },
            monthlyInteractive: { spent: monthly, limit: config.monthlyInteractiveBudgetUsd }
        };
    }

    return {
        snapshot,
        async assertAllowed(check) {
            const config = await deps.configService.get();
            if (config.killSwitch) {
                throw new KillSwitchError();
            }

            const now = deps.now();
            const estimate = Math.max(0, check.estimatedCostUsd);

            const daily = await deps.usageRepo.sumCostForDate(taipeiDate(now));
            if (daily + estimate > config.dailyBudgetUsd) {
                throw new BudgetExceededError('daily', daily, config.dailyBudgetUsd);
            }

            if (check.kind === 'interactive') {
                const weekly = await deps.usageRepo.sumCostSince(taipeiWeekStart(now), { interactiveOnly: true });
                if (weekly + estimate > config.weeklyInteractiveBudgetUsd) {
                    throw new BudgetExceededError('weeklyInteractive', weekly, config.weeklyInteractiveBudgetUsd);
                }
                const monthly = await deps.usageRepo.sumCostSince(taipeiMonthStart(now), { interactiveOnly: true });
                if (monthly + estimate > config.monthlyInteractiveBudgetUsd) {
                    throw new BudgetExceededError('monthlyInteractive', monthly, config.monthlyInteractiveBudgetUsd);
                }
                // TODO(功能三): 每人每週次數上限（一般對話 100、gen_material 30、gen_draft 10）
            }
        }
    };
}
