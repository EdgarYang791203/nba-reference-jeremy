import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { materialGenSchema, stageAResultSchema } from '@nba/shared';
import { createRepos, type Repos } from '../src/repos';
import { createConfigService } from '../src/services/config';
import { createBudgetGuard } from '../src/services/budget';
import { KillSwitchError } from '../src/services/errors';
import { createMockLlm } from '../src/llm/providers/mock';
import { createAnthropicLlm } from '../src/llm/providers/anthropic';
import { withGuard } from '../src/llm/guarded';
import { selectProvider } from '../src/llm';
import { createTestDb, resetDb, type TestDb } from './helpers/db';

let testDb: TestDb;
let repos: Repos;
const NOW = new Date('2026-09-28T02:00:00Z');

beforeAll(async () => {
    testDb = await createTestDb();
    repos = createRepos(testDb.db);
});

afterAll(async () => {
    await testDb.close();
});

beforeEach(async () => {
    await resetDb(testDb.db);
});

function buildClient(mock = createMockLlm()) {
    const configService = createConfigService({ configRepo: repos.config, now: () => NOW, ttlMs: 0 });
    const budgetGuard = createBudgetGuard({ usageRepo: repos.usage, configService, now: () => NOW });
    return { mock, client: withGuard(mock, { budgetGuard, usageRepo: repos.usage, configService, now: () => NOW }) };
}

const meta = { actor: 'scheduler', kind: 'scheduler' as const };

describe('mock provider responders', () => {
    it('stageA 依 <candidates> JSON 回評分，[low] / [dup:N] 標記生效', async () => {
        const mock = createMockLlm();
        const user = `<candidates>${JSON.stringify([
            { idx: 0, title: 'Curry drops 28' },
            { idx: 1, title: 'Betting odds [low]' },
            { idx: 2, title: 'Curry drops 28 again [dup:0]' }
        ])}</candidates>`;
        const result = await mock.complete({ ...meta, tag: 'stageA', model: 'claude-haiku-4-5', system: 's', user, maxTokens: 100 });
        const parsed = stageAResultSchema.parse(JSON.parse(result.text));
        expect(parsed.items).toEqual([
            { idx: 0, value: 4, focus: 4, duplicateOf: null },
            { idx: 1, value: 1, focus: 4, duplicateOf: null },
            { idx: 2, value: 4, focus: 4, duplicateOf: 0 }
        ]);
    });

    it('stageB 回符合 materialGenSchema 的 JSON，keyQuotes 為原文第一句', async () => {
        const mock = createMockLlm();
        const result = await mock.complete({
            ...meta,
            tag: 'stageB',
            model: 'claude-haiku-4-5',
            system: 's',
            user: '<article>Curry said he feels great. The team is ready.</article>',
            maxTokens: 100
        });
        const gen = materialGenSchema.parse(JSON.parse(result.text));
        expect(gen.keyQuotes).toEqual(['Curry said he feels great.']);
    });

    it('batch 生命週期：submit → in_progress → endBatch → results；failBatch 標 errored', async () => {
        const mock = createMockLlm();
        const items = [
            { customId: 'd:1', params: { model: 'm', system: 's', user: '<article>A one.</article>', maxTokens: 10 } },
            { customId: 'd:2', params: { model: 'm', system: 's', user: '<article>B two.</article>', maxTokens: 10 } }
        ];
        const { batchId } = await mock.submitBatch({ ...meta, tag: 'stageB', items });
        expect((await mock.getBatch(batchId)).status).toBe('in_progress');
        await expect(mock.getBatchResults(batchId)).rejects.toThrow();

        mock.failBatch(batchId, ['d:2']);
        const status = await mock.getBatch(batchId);
        expect(status.status).toBe('ended');
        expect(status.counts).toMatchObject({ succeeded: 1, errored: 1 });
        const results = await mock.getBatchResults(batchId);
        expect(results.find((r) => r.customId === 'd:2')?.type).toBe('errored');
    });
});

describe('guarded client', () => {
    it('每次 complete 寫一筆 usage_log，costUsd 依費率計算', async () => {
        const { client } = buildClient();
        await client.complete({ ...meta, tag: 'stageA', model: 'claude-haiku-4-5', system: 'x'.repeat(400), user: 'y'.repeat(400), maxTokens: 100 });
        const rows = await repos.usage.listByDate('2026-09-28');
        expect(rows).toHaveLength(1);
        expect(rows[0].actor).toBe('scheduler');
        expect(rows[0].tokensIn).toBe(200);
        expect(rows[0].costUsd).toBeGreaterThan(0);
    });

    it('killSwitch 拒絕且不寫 usage、不呼叫 provider', async () => {
        await repos.config.set('killSwitch', true);
        const { client, mock } = buildClient();
        await expect(
            client.complete({ ...meta, tag: 'stageA', model: 'claude-haiku-4-5', system: 's', user: 'u', maxTokens: 10 })
        ).rejects.toBeInstanceOf(KillSwitchError);
        expect(mock.calls).toHaveLength(0);
        expect(await repos.usage.listByDate('2026-09-28')).toHaveLength(0);
    });

    it('logBatchUsage 只記 succeeded，費用打 batch 折扣', async () => {
        const { client } = buildClient();
        const usage = { inputTokens: 1_000_000, outputTokens: 0, cacheRead: 0, cacheWrite: 0 };
        await client.logBatchUsage({ ...meta, tag: 'stageB' }, 'claude-haiku-4-5', [
            { customId: 'a', type: 'succeeded', text: '{}', usage },
            { customId: 'b', type: 'errored' }
        ]);
        const rows = await repos.usage.listByDate('2026-09-28');
        expect(rows).toHaveLength(1);
        expect(rows[0].costUsd).toBeCloseTo(0.5, 6); // $1/M × 0.5
    });
});

describe('provider selection', () => {
    it('無 key 或非 anthropic → mock', () => {
        expect(selectProvider({}).name).toBe('mock');
        expect(selectProvider({ LLM_PROVIDER: 'anthropic' }).name).toBe('mock');
        expect(selectProvider({ LLM_PROVIDER: 'mock', ANTHROPIC_API_KEY: 'sk-x' }).name).toBe('mock');
    });
});

describe('anthropic provider（stub SDK，不連網）', () => {
    it('complete 映射 usage 與文字；system 帶 cache_control', async () => {
        let captured: unknown = null;
        const stub = {
            messages: {
                create: async (params: unknown) => {
                    captured = params;
                    return {
                        content: [{ type: 'text', text: '{"ok":true}' }],
                        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 1 },
                        stop_reason: 'end_turn'
                    };
                },
                batches: {}
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = createAnthropicLlm(stub as any);
        const result = await provider.complete({ ...meta, tag: 'stageA', model: 'claude-haiku-4-5', system: 'S', user: 'U', maxTokens: 50 });
        expect(result.text).toBe('{"ok":true}');
        expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5, cacheRead: 3, cacheWrite: 1 });
        expect((captured as { system: Array<{ cache_control: unknown }> }).system[0].cache_control).toEqual({ type: 'ephemeral' });
    });
});
