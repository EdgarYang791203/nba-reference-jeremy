/**
 * collect 階段的驗證鏈（計畫書 4.5.1 / 9C.2 B2、B4；4.2 雙重驗證）：
 * zod → keyQuotes 子字串比對（剔引述不剔素材）→ 名單/ban 檢查 → 組 material row。
 */
import { materialGenSchema, verifyKeyQuotes } from '@nba/shared';
import type { CandidateRow } from '../../repos/candidates';
import type { MaterialInsert } from '../../repos/materials';
import { parseJsonLoose } from '../../llm/json';

export type VerifyOutcome =
    | { ok: true; material: MaterialInsert; droppedQuotes: number }
    | { ok: false; reason: string };

export function verifyGenerated(input: {
    text: string;
    candidate: CandidateRow;
    date: string;
    eligibleIds: ReadonlySet<number>;
    bannedIds: ReadonlySet<number>;
    batchId: string | null;
    usage?: { inputTokens: number; outputTokens: number };
}): VerifyOutcome {
    const { candidate } = input;

    let parsed;
    try {
        parsed = materialGenSchema.safeParse(parseJsonLoose(input.text));
    } catch (error) {
        return { ok: false, reason: `json: ${(error as Error).message.slice(0, 120)}` };
    }
    if (!parsed.success) {
        return { ok: false, reason: `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ').slice(0, 200)}` };
    }

    // 雙重驗證 #2：寫入前再確認在 30+ 名單且不在 ban list
    if (input.bannedIds.has(candidate.playerId)) {
        return { ok: false, reason: 'player banned' };
    }
    if (!input.eligibleIds.has(candidate.playerId)) {
        return { ok: false, reason: 'player not eligible' };
    }

    const sourceText = candidate.articleText ?? candidate.snippet ?? '';
    const keptQuotes = verifyKeyQuotes(parsed.data.keyQuotes, sourceText);

    return {
        ok: true,
        droppedQuotes: parsed.data.keyQuotes.length - keptQuotes.length,
        material: {
            playerId: candidate.playerId,
            date: input.date,
            sourceUrl: candidate.sourceUrl,
            sourceName: candidate.sourceName,
            publishedAt: candidate.publishedAt,
            titleZh: parsed.data.titleZh,
            summaryZh: parsed.data.summaryZh,
            keyQuotes: keptQuotes,
            imageUrl: candidate.imageUrl,
            tags: parsed.data.tags,
            score: candidate.score,
            status: 'published',
            tokensIn: input.usage?.inputTokens ?? null,
            tokensOut: input.usage?.outputTokens ?? null,
            batchId: input.batchId
        }
    };
}
