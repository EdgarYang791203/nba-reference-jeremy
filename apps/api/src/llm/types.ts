/** LLM client 介面：provider（mock / anthropic）+ guarded wrapper（BudgetGuard + usage_log）。 */
import type { TokenUsage } from '@nba/shared';

export type LlmUsage = TokenUsage;

export interface LlmCallMeta {
    /** 用途標籤，mock provider 依此挑回應 */
    tag: 'stageA' | 'stageB' | 'interactive' | 'classify';
    /** 'scheduler' 或使用者 email（usage_log.actor） */
    actor: string;
    kind: 'scheduler' | 'interactive';
}

export interface CompleteParams {
    model: string;
    /** system prompt（provider 會標 cache_control） */
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
}

export type CompleteRequest = LlmCallMeta & CompleteParams;

export interface CompleteResult {
    text: string;
    usage: LlmUsage;
    stopReason: string;
}

export interface BatchRequestItem {
    customId: string;
    params: CompleteParams;
}

export interface BatchStatus {
    status: 'in_progress' | 'ended' | 'canceling';
    counts: { processing: number; succeeded: number; errored: number; expired: number; canceled: number };
    endedAt?: Date | null;
}

export type BatchResultItem =
    | { customId: string; type: 'succeeded'; text: string; usage: LlmUsage }
    | { customId: string; type: 'errored' | 'expired' | 'canceled'; error?: string };

export interface LlmProvider {
    readonly name: 'mock' | 'anthropic';
    complete(req: CompleteRequest): Promise<CompleteResult>;
    submitBatch(req: LlmCallMeta & { items: BatchRequestItem[] }): Promise<{ batchId: string }>;
    getBatch(batchId: string): Promise<BatchStatus>;
    getBatchResults(batchId: string): Promise<BatchResultItem[]>;
    cancelBatch(batchId: string): Promise<void>;
}

/** guarded client：與 provider 同介面，多一個 collect 階段用的批次 usage 記錄 */
export interface LlmClient extends LlmProvider {
    logBatchUsage(meta: LlmCallMeta, model: string, items: BatchResultItem[]): Promise<void>;
}
