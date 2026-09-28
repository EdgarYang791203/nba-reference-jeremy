/**
 * Anthropic provider：Messages API（同步）+ Message Batches API（非同步）。
 * 只在 LLM_PROVIDER=anthropic 且有 ANTHROPIC_API_KEY 時被選用；測試一律注入 mock。
 * system prompt 標 cache_control ephemeral（4.5.1）。
 * ⚠ 12.4：本地一律用 dev key；不得呼叫正式 key。
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
    BatchResultItem,
    BatchStatus,
    CompleteParams,
    LlmProvider,
    LlmUsage
} from '../types';

type SdkClient = Pick<Anthropic, 'messages'>;

function toUsage(usage: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
}): LlmUsage {
    return {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheWrite: usage.cache_creation_input_tokens ?? 0
    };
}

function toMessageParams(params: CompleteParams): Anthropic.MessageCreateParamsNonStreaming {
    return {
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        system: [{ type: 'text', text: params.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: params.user }]
    };
}

function textOf(message: Anthropic.Message): string {
    return message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
}

export function createAnthropicLlm(client: SdkClient): LlmProvider {
    return {
        name: 'anthropic',

        async complete(req) {
            const message = await client.messages.create(toMessageParams(req));
            return { text: textOf(message), usage: toUsage(message.usage), stopReason: message.stop_reason ?? 'unknown' };
        },

        async submitBatch(req) {
            const batch = await client.messages.batches.create({
                requests: req.items.map((item) => ({ custom_id: item.customId, params: toMessageParams(item.params) }))
            });
            return { batchId: batch.id };
        },

        async getBatch(batchId) {
            const batch = await client.messages.batches.retrieve(batchId);
            const status: BatchStatus = {
                status: batch.processing_status,
                counts: {
                    processing: batch.request_counts.processing,
                    succeeded: batch.request_counts.succeeded,
                    errored: batch.request_counts.errored,
                    expired: batch.request_counts.expired,
                    canceled: batch.request_counts.canceled
                },
                endedAt: batch.ended_at ? new Date(batch.ended_at) : null
            };
            return status;
        },

        async getBatchResults(batchId) {
            const items: BatchResultItem[] = [];
            for await (const entry of await client.messages.batches.results(batchId)) {
                if (entry.result.type === 'succeeded') {
                    items.push({
                        customId: entry.custom_id,
                        type: 'succeeded',
                        text: textOf(entry.result.message),
                        usage: toUsage(entry.result.message.usage)
                    });
                } else if (entry.result.type === 'errored') {
                    items.push({ customId: entry.custom_id, type: 'errored', error: JSON.stringify(entry.result.error) });
                } else {
                    items.push({ customId: entry.custom_id, type: entry.result.type });
                }
            }
            return items;
        },

        async cancelBatch(batchId) {
            await client.messages.batches.cancel(batchId);
        }
    };
}

export function createAnthropicClient(apiKey: string): SdkClient {
    return new Anthropic({ apiKey });
}
