/** 階段 A 兩次 JSON 失敗後的規則式選取（計畫書 4.5.1）：發佈時間最新優先，每球員 ≤ perPlayerLimit、總數 ≤ dailyLimit。 */
import type { SelectionLimits } from './candidates';

export interface FallbackCandidate {
    playerId: number;
    publishedAt?: string | Date | null;
}

export function fallbackSelect<T extends FallbackCandidate>(
    candidates: T[],
    limits: Pick<SelectionLimits, 'dailyLimit' | 'perPlayerLimit'>
): T[] {
    const time = (c: FallbackCandidate) => {
        if (!c.publishedAt) {
            return 0;
        }
        const t = new Date(c.publishedAt).getTime();
        return Number.isNaN(t) ? 0 : t;
    };

    const sorted = [...candidates].sort((a, b) => time(b) - time(a));
    const perPlayer = new Map<number, number>();
    const picked: T[] = [];

    for (const c of sorted) {
        if (picked.length >= limits.dailyLimit) {
            break;
        }
        const used = perPlayer.get(c.playerId) ?? 0;
        if (used >= limits.perPlayerLimit) {
            continue;
        }
        perPlayer.set(c.playerId, used + 1);
        picked.push(c);
    }
    return picked;
}
