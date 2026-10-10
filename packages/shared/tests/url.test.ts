import { describe, expect, it } from 'vitest';
import { dedupeByUrl, normalizeUrl } from '../src/domain/url';

describe('normalizeUrl', () => {
    it('去 hash、utm 參數與尾斜線', () => {
        expect(normalizeUrl('https://ESPN.com/story/abc/?utm_source=x&id=1#frag')).toBe(
            'https://espn.com/story/abc?id=1'
        );
    });

    it('query 參數排序後相同 URL 視為同一篇', () => {
        expect(normalizeUrl('https://a.com/p?b=2&a=1')).toBe(normalizeUrl('https://a.com/p?a=1&b=2'));
    });

    it('無效 URL 原樣（trim 後）回傳，不 throw', () => {
        expect(normalizeUrl('  not a url ')).toBe('not a url');
    });
});

describe('dedupeByUrl', () => {
    it('正規化後相同者只留先出現的', () => {
        const items = [
            { sourceUrl: 'https://a.com/x?utm_source=rss', title: 'first' },
            { sourceUrl: 'https://a.com/x', title: 'second' }
        ];
        const result = dedupeByUrl(items);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('first');
    });
});
