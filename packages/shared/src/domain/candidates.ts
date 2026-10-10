/**
 * 排程階段 A 的後處理純函式（計畫書 4.5.1）：
 * score = value + focus，去除 duplicateOf 非 null 者，
 * 按球員取 ≤ perPlayerLimit、總數 ≤ dailyLimit、score < minScore 不取。
 * 上限不硬湊，抓不到就少（4.2）。
 */

export interface ScoredCandidate {
    idx: number;
    playerId: number;
    value: number;
    focus: number;
    duplicateOf: number | null;
    /** ISO string；同分時發佈時間新者優先 */
    publishedAt?: string;
}

export interface SelectionLimits {
    dailyLimit: number;
    perPlayerLimit: number;
    minScore: number;
}

export const DEFAULT_SELECTION_LIMITS: SelectionLimits = {
    dailyLimit: 20,
    perPlayerLimit: 2,
    minScore: 6
};

export function scoreOf(c: Pick<ScoredCandidate, 'value' | 'focus'>): number {
    return c.value + c.focus;
}

export function selectCandidates(
    candidates: ScoredCandidate[],
    limits: SelectionLimits = DEFAULT_SELECTION_LIMITS
): ScoredCandidate[] {
    const sorted = candidates
        .filter((c) => c.duplicateOf === null && scoreOf(c) >= limits.minScore)
        .sort((a, b) => {
            const diff = scoreOf(b) - scoreOf(a);
            if (diff !== 0) {
                return diff;
            }
            return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
        });

    const perPlayer = new Map<number, number>();
    const picked: ScoredCandidate[] = [];

    for (const candidate of sorted) {
        if (picked.length >= limits.dailyLimit) {
            break;
        }
        const used = perPlayer.get(candidate.playerId) ?? 0;
        if (used >= limits.perPlayerLimit) {
            continue;
        }
        perPlayer.set(candidate.playerId, used + 1);
        picked.push(candidate);
    }

    return picked;
}

/** ban list 過濾：生成前、寫入 DB 前各呼叫一次（雙重驗證，4.2）。 */
export function filterBanned<T extends { playerId: number }>(
    items: T[],
    bannedPlayerIds: ReadonlySet<number>
): T[] {
    return items.filter((item) => !bannedPlayerIds.has(item.playerId));
}
