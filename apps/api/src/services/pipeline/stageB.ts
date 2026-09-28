/** 階段 B：組 Batch 請求（計畫書 4.5.1）。custom_id = `${date}:${candidateId}`。 */
import type { AppConfig } from '@nba/shared';
import type { CandidateRow } from '../../repos/candidates';
import { STAGE_B_SYSTEM, buildStageBUser } from '../../llm/prompts/stageB';
import type { BatchRequestItem } from '../../llm/types';

export function customIdFor(date: string, candidateId: number): string {
    return `${date}:${candidateId}`;
}

export function buildBatchRequests(date: string, candidates: CandidateRow[], config: AppConfig): BatchRequestItem[] {
    return candidates.map((c) => ({
        customId: customIdFor(date, c.id),
        params: {
            model: config.models.stageB,
            system: STAGE_B_SYSTEM,
            user: buildStageBUser({
                source: c.sourceName ?? '',
                url: c.sourceUrl,
                published: c.publishedAt ? c.publishedAt.toISOString() : null,
                text: (c.articleText ?? c.snippet ?? '').slice(0, config.articleMaxChars)
            }),
            maxTokens: 1500,
            temperature: 0.3
        }
    }));
}
