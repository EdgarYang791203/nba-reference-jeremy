import { describe, expect, it } from 'vitest';
import { googleNewsUrl, parseFeed } from '../src/sources/rss';
import { extractArticle, extractFromHtmlString } from '../src/sources/extract';
import { retry } from '../src/sources/retry';
import { collectCandidates, isFresh, looksEnglish } from '../src/sources/candidates';
import { DEFAULT_CONFIG } from '@nba/shared';
import { articleHtml, fakeFetch, rssXml } from './helpers/fetch';

const NOW = new Date('2026-09-28T06:00:00Z');
const LONG = Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1}: LeBron James said the team is ready for the season and he feels great about it.`);

describe('rss', () => {
    it('googleNewsUrl 帶引號與 NBA', () => {
        expect(googleNewsUrl('LeBron James')).toBe(
            'https://news.google.com/rss/search?q=%22LeBron%20James%22%20NBA&hl=en-US&gl=US&ceid=US:en'
        );
    });

    it('parseFeed 解析 RSS 2.0（CDATA、pubDate）', () => {
        const items = parseFeed(
            rssXml([{ title: 'LeBron talks season', link: 'https://a.com/1?utm_source=x', description: '<p>Hi <b>there</b></p>', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' }])
        );
        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('LeBron talks season');
        expect(items[0].snippet).toBe('Hi there');
        expect(items[0].publishedAt?.toISOString()).toBe('2026-09-28T05:00:00.000Z');
    });

    it('parseFeed 解析 Atom', () => {
        const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Curry drops 28</title><link rel="alternate" href="https://b.com/2"/><summary>s</summary><published>2026-09-28T04:00:00Z</published></entry></feed>`;
        const items = parseFeed(xml);
        expect(items[0].link).toBe('https://b.com/2');
        expect(items[0].publishedAt?.toISOString()).toBe('2026-09-28T04:00:00.000Z');
    });
});

describe('extract', () => {
    it('從 HTML 擷取正文', async () => {
        const article = await extractFromHtmlString(articleHtml('LeBron talks', LONG), 'https://a.com/1');
        expect(article).not.toBeNull();
        expect(article!.text).toContain('Paragraph 1');
        expect(article!.text.length).toBeGreaterThan(200);
    });

    it('重試 ≤ 2 後失敗回 null', async () => {
        let calls = 0;
        const fetchFn = fakeFetch({}, { onRequest: () => calls++ });
        const result = await extractArticle(fetchFn, 'https://a.com/missing', { delayMs: 0 });
        expect(result).toBeNull();
        expect(calls).toBe(3);
    });

    it('retry 成功即停', async () => {
        let attempts = 0;
        const value = await retry(
            async (attempt) => {
                attempts++;
                if (attempt < 1) {
                    throw new Error('x');
                }
                return 'ok';
            },
            { delayMs: 0 }
        );
        expect(value).toBe('ok');
        expect(attempts).toBe(2);
    });
});

describe('candidates', () => {
    it('looksEnglish / isFresh', () => {
        expect(looksEnglish('LeBron James says he will keep playing')).toBe(true);
        expect(looksEnglish('詹姆斯談新賽季')).toBe(false);
        expect(isFresh(new Date('2026-09-27T00:00:00Z'), NOW, 36)).toBe(true);
        expect(isFresh(new Date('2026-09-26T00:00:00Z'), NOW, 36)).toBe(false);
        expect(isFresh(null, NOW, 36)).toBe(false);
    });

    it('36h 窗口、URL 去重、標題去重、非英文剔除、擷取失敗改用摘要', async () => {
        const feed = rssXml([
            { title: 'LeBron James says he will keep playing', link: 'https://a.com/1?utm_source=rss', description: 'LeBron James on his future', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' },
            { title: 'LeBron James says he will keep playing', link: 'https://a.com/1', description: 'dup by url', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' },
            { title: 'LeBron James says he will keep on playing', link: 'https://a.com/2', description: 'dup by title', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' },
            { title: 'Old LeBron James story', link: 'https://a.com/old', description: 'LeBron James', pubDate: 'Fri, 25 Sep 2026 05:00:00 GMT' },
            { title: '詹姆斯談新賽季', link: 'https://a.com/zh', description: 'LeBron James', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' },
            { title: 'Curry drops 28 in preseason', link: 'https://a.com/curry', description: 'Stephen Curry', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT' }
        ]);
        const fetchFn = fakeFetch({
            'https://news.google.com/rss/search': rssXml([]),
            'https://feed.test/espn': feed,
            'https://a.com/1': articleHtml('LeBron', LONG),
            'https://a.com/curry': { status: 500 }
        });

        const candidates = await collectCandidates({
            players: [
                { id: 1, name: 'LeBron James' },
                { id: 2, name: 'Stephen Curry' }
            ],
            config: { ...DEFAULT_CONFIG, sources: [{ name: 'ESPN', url: 'https://feed.test/espn' }] },
            fetch: fetchFn,
            now: NOW,
            retry: { delayMs: 0 },
            logger: { warn: () => {} }
        });

        const urls = candidates.map((c) => c.sourceUrl).sort();
        expect(urls).toEqual(['https://a.com/1', 'https://a.com/curry']);

        const lebron = candidates.find((c) => c.sourceUrl === 'https://a.com/1')!;
        expect(lebron.playerId).toBe(1);
        expect(lebron.articleText).toContain('Paragraph 1');

        const curry = candidates.find((c) => c.sourceUrl === 'https://a.com/curry')!;
        expect(curry.playerId).toBe(2);
        expect(curry.articleText).toBeNull();
        expect(curry.snippet).toBe('Stephen Curry');
    });
});
