import type { AppConfig } from '@nba/shared';
import type { Repos } from '../../repos';
import type { LlmClient } from '../../llm/types';
import type { FetchLike } from '../../sources/rss';
import type { RetryOptions } from '../../sources/retry';

/** 一次 run 的執行環境：config 為 run 開始時的快照。 */
export interface PipelineCtx {
    repos: Repos;
    llm: LlmClient;
    config: AppConfig;
    fetch: FetchLike;
    now: () => Date;
    logger: Pick<Console, 'info' | 'warn' | 'error'>;
    /** 測試用：擷取重試延遲、是否跳過擷取 */
    sources?: { retry?: RetryOptions; skipExtract?: boolean; concurrency?: number };
}

export const SCHEDULER_ACTOR = 'scheduler';
