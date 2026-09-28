/**
 * provider 選擇：`LLM_PROVIDER=anthropic` 且有 `ANTHROPIC_API_KEY` → 真實 provider；
 * 否則 mock（本地無 key、測試）。回傳的一律是 guarded client。
 */
import type { Repos } from '../repos';
import type { BudgetGuard } from '../services/budget';
import type { ConfigService } from '../services/config';
import { createAnthropicClient, createAnthropicLlm } from './providers/anthropic';
import { createMockLlm } from './providers/mock';
import { withGuard } from './guarded';
import type { LlmClient, LlmProvider } from './types';

export interface LlmEnv {
    LLM_PROVIDER?: string;
    ANTHROPIC_API_KEY?: string;
}

export function selectProvider(env: LlmEnv): LlmProvider {
    if (env.LLM_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
        return createAnthropicLlm(createAnthropicClient(env.ANTHROPIC_API_KEY));
    }
    return createMockLlm();
}

export function createLlmClient(
    provider: LlmProvider,
    deps: { budgetGuard: BudgetGuard; usageRepo: Repos['usage']; configService: ConfigService; now: () => Date }
): LlmClient {
    return withGuard(provider, deps);
}

export type { LlmClient, LlmProvider } from './types';
