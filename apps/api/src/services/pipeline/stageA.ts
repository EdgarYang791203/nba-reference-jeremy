/**
 * 階段 A 篩選評分（計畫書 4.5.1）：同步 Messages 呼叫，一次送全部候選；超過 stageAChunkSize 分批。
 * JSON parse 失敗帶錯誤重試 1 次；再失敗以「發佈時間最新優先」規則式 fallback，並回報錯誤字串供 runs.error。
 */
import { stageAResultSchema, type ScoredCandidate } from '@nba/shared';
import type { CandidateRow } from '../../repos/candidates';
import { STAGE_A_SYSTEM, buildStageARetryUser, buildStageAUser, type StageACandidateInput } from '../../llm/prompts/stageA';
import { parseJsonLoose } from '../../llm/json';
import { SCHEDULER_ACTOR, type PipelineCtx } from './types';

export type StageAOutcome =
    | { fallback: false; items: ScoredCandidate[] }
    | { fallback: true; error: string };

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

function toInput(c: CandidateRow, idx: number, playerNames: Map<number, string>): StageACandidateInput {
    return {
        idx,
        playerName: playerNames.get(c.playerId) ?? String(c.playerId),
        title: c.title,
        snippet: (c.snippet ?? '').slice(0, 300),
        source: c.sourceName ?? '',
        publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null
    };
}

async function scoreChunk(ctx: PipelineCtx, inputs: StageACandidateInput[]): Promise<Array<{ idx: number; value: number; focus: number; duplicateOf: number | null }>> {
    const base = {
        tag: 'stageA' as const,
        actor: SCHEDULER_ACTOR,
        kind: 'scheduler' as const,
        model: ctx.config.models.stageA,
        system: STAGE_A_SYSTEM,
        maxTokens: 4000,
        temperature: 0
    };
    const user = buildStageAUser(inputs);

    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
        const result = await ctx.llm.complete({ ...base, user: attempt === 0 ? user : buildStageARetryUser(user, lastError) });
        try {
            const parsed = stageAResultSchema.parse(parseJsonLoose(result.text));
            return parsed.items;
        } catch (error) {
            lastError = (error as Error).message.slice(0, 200);
            ctx.logger.warn(`[stageA] parse failed (attempt ${attempt + 1}): ${lastError}`);
        }
    }
    throw new Error(`stageA parse failed twice: ${lastError}`);
}

export async function scoreCandidates(
    ctx: PipelineCtx,
    candidates: CandidateRow[],
    playerNames: Map<number, string>
): Promise<StageAOutcome> {
    if (!candidates.length) {
        return { fallback: false, items: [] };
    }

    // 依球員分批（同球員盡量同批，重複判斷才有意義）
    const byPlayer = [...candidates.entries()].sort((a, b) => a[1].playerId - b[1].playerId);
    const chunks = chunk(byPlayer, ctx.config.stageAChunkSize);

    const items: ScoredCandidate[] = [];
    try {
        for (const group of chunks) {
            const inputs = group.map(([globalIdx, c]) => toInput(c, globalIdx, playerNames));
            const scored = await scoreChunk(ctx, inputs);
            for (const s of scored) {
                const candidate = candidates[s.idx];
                if (!candidate) {
                    continue;
                }
                items.push({
                    idx: s.idx,
                    playerId: candidate.playerId,
                    value: s.value,
                    focus: s.focus,
                    duplicateOf: s.duplicateOf,
                    publishedAt: candidate.publishedAt?.toISOString()
                });
            }
        }
        return { fallback: false, items };
    } catch (error) {
        // BudgetGuard / killSwitch 例外不可吞：讓 run 直接 failed
        if (error instanceof Error && (error.name === 'AppError' || 'status' in error)) {
            throw error;
        }
        return { fallback: true, error: (error as Error).message };
    }
}
