import { beforeEach, describe, expect, it } from 'vitest';
import {
    NEW_BADGE_STORAGE_PREFIX,
    computeIsNew,
    readLastSeen,
    writeLastSeen
} from '../src/composables/useNewBadge';

const now = new Date('2026-09-28T12:00:00Z');

describe('computeIsNew', () => {
    it('createdAt 晚於上次瀏覽 → NEW', () => {
        expect(computeIsNew('2026-09-28T05:30:00Z', '2026-09-27T20:00:00Z', now)).toBe(true);
    });

    it('createdAt 早於上次瀏覽 → 不是 NEW（看過即消失）', () => {
        expect(computeIsNew('2026-09-27T05:30:00Z', '2026-09-27T20:00:00Z', now)).toBe(false);
    });

    it('從未瀏覽 → 只有近 3 天內算 NEW', () => {
        expect(computeIsNew('2026-09-26T05:30:00Z', undefined, now)).toBe(true);
        expect(computeIsNew('2026-09-20T05:30:00Z', undefined, now)).toBe(false);
    });

    it('無效日期 → false', () => {
        expect(computeIsNew('not-a-date', undefined, now)).toBe(false);
    });
});

describe('localStorage helpers', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('write / read 往返', () => {
        writeLastSeen(7, now);
        expect(readLastSeen(7)).toBe(now.toISOString());
        expect(localStorage.getItem(`${NEW_BADGE_STORAGE_PREFIX}7`)).toBe(now.toISOString());
    });

    it('未寫入回 undefined', () => {
        expect(readLastSeen(99)).toBeUndefined();
    });
});
