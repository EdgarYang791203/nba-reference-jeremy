import { describe, expect, it } from 'vitest';
import {
    filterBanned,
    selectCandidates,
    type ScoredCandidate
} from '../src/domain/candidates';

const candidate = (over: Partial<ScoredCandidate> & { idx: number }): ScoredCandidate => ({
    playerId: 1,
    value: 4,
    focus: 4,
    duplicateOf: null,
    ...over
});

describe('selectCandidates', () => {
    it('去除 duplicateOf 非 null 者', () => {
        const picked = selectCandidates([
            candidate({ idx: 0 }),
            candidate({ idx: 1, duplicateOf: 0 })
        ]);
        expect(picked.map((c) => c.idx)).toEqual([0]);
    });

    it('score < minScore 不取', () => {
        const picked = selectCandidates([candidate({ idx: 0, value: 2, focus: 3 })]);
        expect(picked).toHaveLength(0);
    });

    it('每球員 ≤ perPlayerLimit（取分數高者）', () => {
        const picked = selectCandidates([
            candidate({ idx: 0, playerId: 7, value: 5, focus: 5 }),
            candidate({ idx: 1, playerId: 7, value: 4, focus: 4 }),
            candidate({ idx: 2, playerId: 7, value: 3, focus: 3 })
        ]);
        expect(picked.map((c) => c.idx)).toEqual([0, 1]);
    });

    it('總數 ≤ dailyLimit，上限不硬湊', () => {
        const many = Array.from({ length: 30 }, (_, i) =>
            candidate({ idx: i, playerId: i, value: 5, focus: 5 })
        );
        expect(selectCandidates(many)).toHaveLength(20);
        expect(selectCandidates(many.slice(0, 3))).toHaveLength(3);
    });

    it('同分時發佈時間新者優先', () => {
        const picked = selectCandidates(
            [
                candidate({ idx: 0, playerId: 1, publishedAt: '2026-09-27T00:00:00Z' }),
                candidate({ idx: 1, playerId: 2, publishedAt: '2026-09-28T00:00:00Z' })
            ],
            { dailyLimit: 1, perPlayerLimit: 2, minScore: 6 }
        );
        expect(picked.map((c) => c.idx)).toEqual([1]);
    });
});

describe('filterBanned', () => {
    it('剔除 ban list 上的球員', () => {
        const items = [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }];
        expect(filterBanned(items, new Set([2]))).toEqual([{ playerId: 1 }, { playerId: 3 }]);
    });
});
