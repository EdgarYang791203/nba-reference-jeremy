import { describe, expect, it } from 'vitest';
import { dedupeByTitle, titleSimilarity } from '../src/domain/similarity';
import { fallbackSelect } from '../src/domain/fallback';

describe('titleSimilarity / dedupeByTitle', () => {
    it('幾乎相同的標題視為重複', () => {
        const a = 'LeBron James says he will keep playing as long as his body allows';
        const b = "LeBron James: I'll keep playing as long as my body allows";
        expect(titleSimilarity(a, b)).toBeGreaterThanOrEqual(0.5);
    });

    it('不同主題不重複', () => {
        expect(titleSimilarity('Curry drops 28 in preseason win', 'Durant out two weeks with calf strain')).toBeLessThan(0.2);
    });

    it('dedupeByTitle 保留先出現者', () => {
        const items = [
            { title: 'Curry drops 28 points in preseason win over Suns', id: 1 },
            { title: 'Curry drops 28 points in preseason win over the Suns', id: 2 },
            { title: 'Durant out two weeks', id: 3 }
        ];
        expect(dedupeByTitle(items).map((i) => i.id)).toEqual([1, 3]);
    });
});

describe('fallbackSelect', () => {
    it('最新優先、每球員上限、總數上限', () => {
        const picked = fallbackSelect(
            [
                { id: 1, playerId: 1, publishedAt: '2026-09-28T01:00:00Z' },
                { id: 2, playerId: 1, publishedAt: '2026-09-28T03:00:00Z' },
                { id: 3, playerId: 1, publishedAt: '2026-09-28T02:00:00Z' },
                { id: 4, playerId: 2, publishedAt: '2026-09-27T00:00:00Z' },
                { id: 5, playerId: 3, publishedAt: null }
            ],
            { dailyLimit: 3, perPlayerLimit: 2 }
        );
        expect(picked.map((p) => p.id)).toEqual([2, 3, 4]);
    });
});
