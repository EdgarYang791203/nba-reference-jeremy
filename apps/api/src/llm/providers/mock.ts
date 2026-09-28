/**
 * Mock LLM provider：測試與無 key 本地開發用。決定性輸出、可檢視呼叫、可控制 batch 生命週期。
 * - stageA：從 user prompt 的 <candidates> JSON 讀回候選，每筆回 value 4 / focus 4；
 *   標題含 `[low]` → value 1；`[dup:N]` → duplicateOf N。
 * - stageB：回固定摘要，keyQuotes = 原文第一句（讓子字串比對預設通過）。
 * - queue(tag, fn) 一次性覆寫、setDefault(tag, fn) 永久覆寫；endBatch/failBatch 控制 batch。
 */
import { MOCK_SUMMARY_ZH, MOCK_TAGS, MOCK_TITLE_ZH, firstSentence } from './mock-fixtures';
import type {
    BatchRequestItem,
    BatchResultItem,
    BatchStatus,
    CompleteParams,
    CompleteRequest,
    CompleteResult,
    LlmCallMeta,
    LlmProvider,
    LlmUsage
} from '../types';

export type Responder = (params: CompleteParams, meta: LlmCallMeta) => string;

interface MockBatch {
    items: BatchRequestItem[];
    meta: LlmCallMeta;
    status: BatchStatus['status'];
    results: BatchResultItem[] | null;
    createdAt: Date;
}

export interface MockLlmOptions {
    /** submitBatch 後立即 ended（happy path 測試） */
    autoEnd?: boolean;
    now?: () => Date;
}

function estimateUsage(params: CompleteParams, text: string): LlmUsage {
    return {
        inputTokens: Math.ceil((params.system.length + params.user.length) / 4),
        outputTokens: Math.ceil(text.length / 4),
        cacheRead: 0,
        cacheWrite: 0
    };
}

function extractBlock(text: string, tag: string): string | null {
    const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return match ? match[1].trim() : null;
}

export function defaultStageAResponder(params: CompleteParams): string {
    const block = extractBlock(params.user, 'candidates');
    let candidates: Array<{ idx: number; title?: string }> = [];
    try {
        candidates = block ? JSON.parse(block) : [];
    } catch {
        candidates = [];
    }
    const items = candidates.map((c) => {
        const title = c.title ?? '';
        const dup = title.match(/\[dup:(\d+)\]/);
        return {
            idx: c.idx,
            value: /\[low\]/.test(title) ? 1 : 4,
            focus: 4,
            duplicateOf: dup ? Number(dup[1]) : null
        };
    });
    return JSON.stringify({ items });
}

export function defaultStageBResponder(params: CompleteParams): string {
    const article = extractBlock(params.user, 'article') ?? '';
    const quote = firstSentence(article);
    return JSON.stringify({
        titleZh: MOCK_TITLE_ZH,
        summaryZh: MOCK_SUMMARY_ZH,
        keyQuotes: quote ? [quote] : [],
        tags: MOCK_TAGS
    });
}

export interface MockLlm extends LlmProvider {
    readonly calls: CompleteRequest[];
    readonly batches: Map<string, MockBatch>;
    queue(tag: LlmCallMeta['tag'], responder: Responder): void;
    setDefault(tag: LlmCallMeta['tag'], responder: Responder): void;
    /** 結束 batch；可覆寫個別 customId 的結果 */
    endBatch(batchId: string, overrides?: Record<string, Partial<BatchResultItem> & { text?: string }>): void;
    /** 指定 customId 標為 errored */
    failBatch(batchId: string, customIds: string[]): void;
}

export function createMockLlm(options: MockLlmOptions = {}): MockLlm {
    const now = options.now ?? (() => new Date());
    const calls: CompleteRequest[] = [];
    const batches = new Map<string, MockBatch>();
    const defaults = new Map<LlmCallMeta['tag'], Responder>([
        ['stageA', defaultStageAResponder],
        ['stageB', defaultStageBResponder],
        ['interactive', () => '{"reply":"mock"}'],
        ['classify', () => '{"intent":"ask"}']
    ]);
    const queued = new Map<LlmCallMeta['tag'], Responder[]>();
    let batchSeq = 0;

    function respond(params: CompleteParams, meta: LlmCallMeta): string {
        const q = queued.get(meta.tag);
        const responder = q?.shift() ?? defaults.get(meta.tag);
        if (!responder) {
            throw new Error(`mock llm: no responder for tag ${meta.tag}`);
        }
        return responder(params, meta);
    }

    function buildResults(batch: MockBatch): BatchResultItem[] {
        return batch.items.map((item) => {
            const text = respond(item.params, batch.meta);
            return { customId: item.customId, type: 'succeeded', text, usage: estimateUsage(item.params, text) };
        });
    }

    return {
        name: 'mock',
        calls,
        batches,

        async complete(req) {
            calls.push(req);
            const text = respond(req, req);
            const result: CompleteResult = { text, usage: estimateUsage(req, text), stopReason: 'end_turn' };
            return result;
        },

        async submitBatch(req) {
            batchSeq += 1;
            const batchId = `mock-batch-${batchSeq}`;
            const batch: MockBatch = {
                items: req.items,
                meta: req,
                status: options.autoEnd ? 'ended' : 'in_progress',
                results: null,
                createdAt: now()
            };
            if (options.autoEnd) {
                batch.results = buildResults(batch);
            }
            batches.set(batchId, batch);
            return { batchId };
        },

        async getBatch(batchId) {
            const batch = batches.get(batchId);
            if (!batch) {
                throw new Error(`mock llm: unknown batch ${batchId}`);
            }
            const results = batch.results ?? [];
            const succeeded = results.filter((r) => r.type === 'succeeded').length;
            const errored = results.filter((r) => r.type === 'errored').length;
            const expired = results.filter((r) => r.type === 'expired').length;
            const canceled = results.filter((r) => r.type === 'canceled').length;
            return {
                status: batch.status,
                counts: {
                    processing: batch.status === 'ended' ? 0 : batch.items.length,
                    succeeded,
                    errored,
                    expired,
                    canceled
                },
                endedAt: batch.status === 'ended' ? now() : null
            };
        },

        async getBatchResults(batchId) {
            const batch = batches.get(batchId);
            if (!batch || batch.status !== 'ended' || !batch.results) {
                throw new Error(`mock llm: batch ${batchId} not ended`);
            }
            return batch.results;
        },

        async cancelBatch(batchId) {
            const batch = batches.get(batchId);
            if (batch && batch.status !== 'ended') {
                batch.status = 'ended';
                batch.results = batch.items.map((item) => ({ customId: item.customId, type: 'canceled' }));
            }
        },

        queue(tag, responder) {
            const list = queued.get(tag) ?? [];
            list.push(responder);
            queued.set(tag, list);
        },

        setDefault(tag, responder) {
            defaults.set(tag, responder);
        },

        endBatch(batchId, overrides = {}) {
            const batch = batches.get(batchId);
            if (!batch) {
                throw new Error(`mock llm: unknown batch ${batchId}`);
            }
            const results = buildResults(batch).map((r) => {
                const override = overrides[r.customId];
                if (!override) {
                    return r;
                }
                if (override.type && override.type !== 'succeeded') {
                    return { customId: r.customId, type: override.type, error: 'error' in override ? override.error : 'mock error' } as BatchResultItem;
                }
                if (r.type === 'succeeded' && override.text !== undefined) {
                    return { ...r, text: override.text };
                }
                return r;
            });
            batch.status = 'ended';
            batch.results = results;
        },

        failBatch(batchId, customIds) {
            const overrides: Record<string, Partial<BatchResultItem>> = {};
            for (const id of customIds) {
                overrides[id] = { type: 'errored' };
            }
            this.endBatch(batchId, overrides);
        }
    };
}
