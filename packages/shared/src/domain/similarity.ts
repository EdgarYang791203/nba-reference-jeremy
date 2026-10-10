/** 標題相似度去重（計畫書 4.4 步驟 3）：token Jaccard，超過門檻視為同一篇。 */

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'as', 'is', 'are',
    'was', 'be', 'his', 'her', 'their', 'nba', 'vs'
]);

export function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[’'"“”‘]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function titleTokens(title: string): Set<string> {
    return new Set(
        normalizeTitle(title)
            .split(' ')
            .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    );
}

export function titleSimilarity(a: string, b: string): number {
    const ta = titleTokens(a);
    const tb = titleTokens(b);
    if (ta.size === 0 || tb.size === 0) {
        return 0;
    }
    let intersection = 0;
    for (const t of ta) {
        if (tb.has(t)) {
            intersection += 1;
        }
    }
    const union = ta.size + tb.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

/** 相似度 ≥ threshold 視為重複，保留先出現者。O(n²)，候選量（≤ 數百）可接受。 */
export function dedupeByTitle<T extends { title: string }>(items: T[], threshold = 0.8): T[] {
    const kept: T[] = [];
    for (const item of items) {
        const duplicate = kept.some((k) => titleSimilarity(k.title, item.title) >= threshold);
        if (!duplicate) {
            kept.push(item);
        }
    }
    return kept;
}
