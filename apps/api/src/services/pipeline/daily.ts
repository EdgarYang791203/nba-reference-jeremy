/**
 * 每日排程 daily（計畫書 4.4 步驟 1–6）：
 * runs[date] 冪等 → fetching（候選落 run_candidates）→ generating（階段 A → selectCandidates → 雙重驗證 #1 → Batch 送出）→ collecting。
 * 任何例外（含 BudgetGuard / killSwitch）→ failed 並記 error；路由仍回 200 避免 Scheduler 重試燒錢。
 */
import { fallbackSelect, filterBanned, scoreOf, selectCandidates, taipeiDate } from '@nba/shared';
import { collectCandidates } from '../../sources/candidates';
import { createPlayersService } from '../players';
import { scoreCandidates } from './stageA';
import { buildBatchRequests, customIdFor } from './stageB';
import { SCHEDULER_ACTOR, type PipelineCtx } from './types';

export interface DailyResult {
    date: string;
    status: string;
    skipped?: boolean;
    candidateCount?: number;
    generatedCount?: number;
    error?: string | null;
}

export async function runDaily(ctx: PipelineCtx, options: { date?: string } = {}): Promise<DailyResult> {
    const now = ctx.now();
    const date = options.date ?? taipeiDate(now);
    const { repos, config } = ctx;

    // 1. 冪等：done / collecting / failed 不重跑；進行中且未逾時 → 視為併發
    const existing = await repos.runs.get(date);
    if (existing) {
        if (existing.status === 'done' || existing.status === 'collecting' || existing.status === 'failed') {
            return { date, status: existing.status, skipped: true, error: existing.error };
        }
        const startedAt = existing.startedAt?.getTime() ?? 0;
        const staleMs = config.staleRunMinutes * 60 * 1000;
        if (now.getTime() - startedAt < staleMs) {
            return { date, status: existing.status, skipped: true, error: 'in_progress' };
        }
        ctx.logger.warn(`[daily] run ${date} looks crashed (status ${existing.status}); restarting`);
        await repos.candidates.deleteByRun(date);
    }

    await repos.runs.upsert({ date, status: 'pending', startedAt: now, finishedAt: null, error: null, batchId: null });

    try {
        // 2. 名單
        const playersService = createPlayersService(repos);
        const players = await playersService.listEligible(config, now);
        const playerNames = new Map(players.map((p) => [p.id, p.name]));

        // 3–4. 抓外電 + 擷取
        await repos.runs.patch(date, { status: 'fetching' });
        const raw = await collectCandidates({
            players: players.map((p) => ({ id: p.id, name: p.name })),
            config,
            fetch: ctx.fetch,
            now,
            retry: ctx.sources?.retry,
            skipExtract: ctx.sources?.skipExtract,
            concurrency: ctx.sources?.concurrency,
            logger: ctx.logger
        });
        const candidates = await repos.candidates.insertMany(
            raw.map((c) => ({
                runDate: date,
                playerId: c.playerId,
                sourceUrl: c.sourceUrl,
                sourceName: c.sourceName,
                title: c.title,
                snippet: c.snippet,
                publishedAt: c.publishedAt,
                articleText: c.articleText,
                imageUrl: c.imageUrl
            }))
        );
        await repos.runs.patch(date, { status: 'generating', candidateCount: candidates.length });

        if (!candidates.length) {
            await repos.runs.patch(date, { status: 'done', generatedCount: 0, finishedAt: ctx.now() });
            return { date, status: 'done', candidateCount: 0, generatedCount: 0 };
        }

        // 5. 階段 A
        const limits = { dailyLimit: config.dailyLimit, perPlayerLimit: config.perPlayerLimit, minScore: config.minScore };
        const outcome = await scoreCandidates(ctx, candidates, playerNames);
        let runError: string | null = null;
        let picked: Array<{ candidate: (typeof candidates)[number]; score: number | null }>;

        if (outcome.fallback) {
            runError = `stageA fallback: ${outcome.error}`;
            picked = fallbackSelect(
                candidates.map((c) => ({ ...c, publishedAt: c.publishedAt })),
                limits
            ).map((c) => ({ candidate: c, score: null }));
        } else {
            picked = selectCandidates(outcome.items, limits).map((s) => ({ candidate: candidates[s.idx], score: scoreOf(s) }));
        }

        // 雙重驗證 #1：生成前再檢查名單與 ban list（名單可能在排程中途變動）
        const [eligibleIds, bannedIds] = await Promise.all([
            playersService.eligibleIdSet(config, ctx.now()),
            repos.banlist.idSet()
        ]);
        const verified = filterBanned(
            picked.map((p) => ({ ...p, playerId: p.candidate.playerId })),
            bannedIds
        ).filter((p) => eligibleIds.has(p.playerId));

        if (!verified.length) {
            await repos.runs.patch(date, { status: 'done', generatedCount: 0, finishedAt: ctx.now(), error: runError });
            return { date, status: 'done', candidateCount: candidates.length, generatedCount: 0, error: runError };
        }

        await repos.candidates.markSelected(
            verified.map((p) => ({ id: p.candidate.id, customId: customIdFor(date, p.candidate.id), score: p.score ?? 0 }))
        );

        // 6. 階段 B：Batch 送出
        const selectedRows = await repos.candidates.listSelected(date);
        const { batchId } = await ctx.llm.submitBatch({
            tag: 'stageB',
            actor: SCHEDULER_ACTOR,
            kind: 'scheduler',
            items: buildBatchRequests(date, selectedRows, config)
        });
        await repos.runs.patch(date, { status: 'collecting', batchId, generatedCount: selectedRows.length, error: runError });
        ctx.logger.info(`[daily] ${date}: ${candidates.length} candidates → ${selectedRows.length} submitted (batch ${batchId})`);
        return { date, status: 'collecting', candidateCount: candidates.length, generatedCount: selectedRows.length, error: runError };
    } catch (error) {
        const message = (error as Error).message.slice(0, 500);
        ctx.logger.error(`[daily] ${date} failed: ${message}`);
        await repos.runs.patch(date, { status: 'failed', error: message, finishedAt: ctx.now() });
        return { date, status: 'failed', error: message };
    }
}
