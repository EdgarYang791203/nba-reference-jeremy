/** 測試用 app：pglite db + mock llm + fake fetch + 固定時鐘；可預先寫 config rows。 */
import { createApp } from '../../src/app';
import { createServices, resolveDeps, type AppDeps } from '../../src/deps';
import { createRepos } from '../../src/repos';
import type { Db } from '../../src/repos/db';
import { createMockLlm, type MockLlm, type MockLlmOptions } from '../../src/llm/providers/mock';
import type { FetchLike } from '../../src/sources/rss';
import type { Env } from '../../src/env';
import { fakeFetch } from './fetch';

export interface TestAppOptions {
    db: Db;
    now?: () => Date;
    llm?: MockLlm;
    mockOptions?: MockLlmOptions;
    fetch?: FetchLike;
    env?: Partial<Env>;
    config?: Record<string, unknown>;
}

export const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

export async function createTestApp(options: TestAppOptions) {
    const now = options.now ?? (() => new Date('2026-09-28T02:00:00Z'));
    const llm = options.llm ?? createMockLlm({ now, ...options.mockOptions });
    const env: Env = { NODE_ENV: 'test', PORT: 0, ...options.env };

    const repos = createRepos(options.db);
    for (const [key, value] of Object.entries(options.config ?? {})) {
        await repos.config.set(key, value);
    }

    const deps: AppDeps = resolveDeps({
        db: options.db,
        llmProvider: llm,
        fetch: options.fetch ?? fakeFetch({}),
        now,
        env,
        logger: silentLogger,
        sources: { retry: { delayMs: 0 }, concurrency: 2 }
    });
    const services = createServices(deps);
    const app = createApp(deps);

    return { app, services, llm, repos, deps };
}
