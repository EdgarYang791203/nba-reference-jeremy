/**
 * collect（計畫書 4.4 步驟 7–8）：純靠 DB 狀態續跑。
 * Batch 未 ended → 仍 collecting（逾時 batchTimeoutHours → cancel + failed，同日不重送）；
 * ended → 結果 ↔ run_candidates（customId）→ 驗證鏈 → 單一 transaction 寫 materials / candidates / usage_log / runs.done。
 */
import { hoursBetween } from '@nba/shared';
import { createRepos } from '../../repos';
import type { Db } from '../../repos/db';
import { createPlayersService } from '../players';
import { verifyGenerated } from './verify';
import { SCHEDULER_ACTOR, type PipelineCtx } from './types';

export interface CollectResult {
    date: string;
    status: string;
    skipped?: boolean;
    inserted?: number;
    rejected?: number;
    error?: string | null;
}

export async function runCollect(ctx: PipelineCtx & { db: Db }, options: { date: string }): Promise<CollectResult> {
    const { date } = options;
    const { repos, config } = ctx;
    const now = ctx.now();

    const run = await repos.runs.get(date);
    if (!run) {
        return { date, status: 'missing', skipped: true, error: 'no run for date' };
    }
    if (run.status === 'done' || run.status === 'failed') {
        return { date, status: run.status, skipped: true, error: run.error };
    }
    if (run.status !== 'collecting' || !run.batchId) {
        return { date, status: run.status, skipped: true, error: 'not collecting yet' };
    }

    const status = await ctx.llm.getBatch(run.batchId);
    if (status.status !== 'ended') {
        const started = run.startedAt ?? now;
        if (hoursBetween(started, now) > config.batchTimeoutHours) {
            try {
                await ctx.llm.cancelBatch(run.batchId);
            } catch (error) {
                ctx.logger.warn(`[collect] cancel ${run.batchId} failed: ${(error as Error).message}`);
            }
            await repos.runs.patch(date, { status: 'failed', error: 'batch timeout', finishedAt: now });
            return { date, status: 'failed', error: 'batch timeout' };
        }
        return { date, status: 'collecting', skipped: true };
    }

    const results = await ctx.llm.getBatchResults(run.batchId);
    const candidates = await repos.candidates.listSelected(date);
    const byCustomId = new Map(candidates.map((c) => [c.customId ?? '', c]));

    const playersService = createPlayersService(repos);
    const [eligibleIds, bannedIds] = await Promise.all([playersService.eligibleIdSet(config, now), repos.banlist.idSet()]);

    const accepted: Array<{ candidateId: number; material: ReturnType<typeof verifyGenerated> & { ok: true } }> = [];
    const rejected: Array<{ candidateId: number; reason: string }> = [];
    const seenCandidateIds = new Set<number>();

    for (const item of results) {
        const candidate = byCustomId.get(item.customId);
        if (!candidate) {
            ctx.logger.warn(`[collect] unknown custom_id ${item.customId}`);
            continue;
        }
        seenCandidateIds.add(candidate.id);
        if (item.type !== 'succeeded') {
            rejected.push({ candidateId: candidate.id, reason: `batch ${item.type}${item.error ? `: ${item.error.slice(0, 120)}` : ''}` });
            continue;
        }
        const outcome = verifyGenerated({
            text: item.text,
            candidate,
            date,
            eligibleIds,
            bannedIds,
            batchId: run.batchId,
            usage: item.usage
        });
        if (outcome.ok) {
            accepted.push({ candidateId: candidate.id, material: outcome });
        } else {
            rejected.push({ candidateId: candidate.id, reason: outcome.reason });
        }
    }
    for (const c of candidates) {
        if (!seenCandidateIds.has(c.id)) {
            rejected.push({ candidateId: c.id, reason: 'missing from batch results' });
        }
    }

    const errorSummary = rejected.length
        ? `${rejected.length} rejected: ${rejected
              .slice(0, 5)
              .map((r) => `#${r.candidateId} ${r.reason}`)
              .join(' | ')}`.slice(0, 500)
        : null;
    const combinedError = [run.error, errorSummary].filter(Boolean).join(' || ') || null;

    let insertedCount = 0;
    await ctx.db.transaction(async (tx) => {
        const txRepos = createRepos(tx as unknown as Db);
        const inserted = await txRepos.materials.insertMany(accepted.map((a) => a.material.material));
        insertedCount = inserted.length;
        const insertedUrls = new Set(inserted.map((m) => m.sourceUrl));
        for (const a of accepted) {
            const wasInserted = insertedUrls.has(a.material.material.sourceUrl);
            await txRepos.candidates.patch(a.candidateId, {
                status: wasInserted ? 'inserted' : 'rejected',
                rejectReason: wasInserted ? null : 'duplicate sourceUrl'
            });
        }
        for (const r of rejected) {
            await txRepos.candidates.patch(r.candidateId, { status: 'rejected', rejectReason: r.reason });
        }
        await txRepos.runs.patch(date, { status: 'done', generatedCount: insertedCount, error: combinedError, finishedAt: ctx.now() });
    });
    // usage 從 batch result 取（4.5.1），以 Batch 費率計；在 transaction 之後寫，失敗不影響素材入庫
    await ctx.llm.logBatchUsage({ tag: 'stageB', actor: SCHEDULER_ACTOR, kind: 'scheduler' }, config.models.stageB, results);

    ctx.logger.info(`[collect] ${date}: inserted ${insertedCount}, rejected ${rejected.length}`);
    return { date, status: 'done', inserted: insertedCount, rejected: rejected.length, error: combinedError };
}
