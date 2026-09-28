/**
 * 依賴注入：createApp(deps) 收 db / llm provider / fetch / now / env，
 * 測試以 pglite + mock llm + fake fetch + 固定時鐘注入；正式環境用預設。
 */
import type { Db } from './repos/db';
import { getDb } from './repos/db';
import { createRepos } from './repos';
import { createConfigService } from './services/config';
import { createBudgetGuard } from './services/budget';
import { createPlayersService } from './services/players';
import { createBanlistService } from './services/banlist';
import { createMaterialsService } from './services/materials';
import { createLlmClient, selectProvider } from './llm';
import type { LlmProvider } from './llm/types';
import type { FetchLike } from './sources/rss';
import type { RetryOptions } from './sources/retry';
import { readEnv, type Env } from './env';
import type { PipelineCtx } from './services/pipeline/types';

export interface AppDeps {
    db: Db;
    llmProvider: LlmProvider;
    fetch: FetchLike;
    now: () => Date;
    env: Env;
    logger: Pick<Console, 'info' | 'warn' | 'error'>;
    sources?: PipelineCtx['sources'];
}

export function resolveDeps(partial: Partial<AppDeps> = {}): AppDeps {
    const env = partial.env ?? readEnv();
    return {
        env,
        db: partial.db ?? getDb(),
        llmProvider: partial.llmProvider ?? selectProvider(env),
        fetch: partial.fetch ?? ((input, init) => globalThis.fetch(input, init)),
        now: partial.now ?? (() => new Date()),
        logger: partial.logger ?? console,
        sources: partial.sources
    };
}

export function createServices(deps: AppDeps) {
    const repos = createRepos(deps.db);
    const configService = createConfigService({ configRepo: repos.config, now: deps.now });
    const budgetGuard = createBudgetGuard({ usageRepo: repos.usage, configService, now: deps.now });
    const llm = createLlmClient(deps.llmProvider, { budgetGuard, usageRepo: repos.usage, configService, now: deps.now });

    return {
        repos,
        configService,
        budgetGuard,
        llm,
        players: createPlayersService(repos),
        banlist: createBanlistService(repos),
        materials: createMaterialsService(repos),

        /** 每次 run 用當下 config 快照組 ctx */
        async pipelineCtx(): Promise<PipelineCtx & { db: Db }> {
            return {
                db: deps.db,
                repos,
                llm,
                config: await configService.get(),
                fetch: deps.fetch,
                now: deps.now,
                logger: deps.logger,
                sources: deps.sources
            };
        }
    };
}

export type Services = ReturnType<typeof createServices>;
export type { RetryOptions };
