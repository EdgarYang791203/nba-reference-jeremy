import { describe, expect, it } from 'vitest';
import { googleNewsUrl, parseFeed } from '../src/sources/rss';
import { extractArticle, extractFromHtmlString } from '../src/sources/extract';
import { retry } from '../src/sources/retry';
import { collectCandidates, isFresh, looksEnglish, snippetUsable } from '../src/sources/candidates';
import { decodeLegacyGoogleNewsId, parseBatchResponse, parseGoogleNewsId, resolveGoogleNewsUrl } from '../src/sources/googleNews';
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

/** 新格式 id（AU_yqL…，無法離線解碼） */
const GN_ID = 'CBMiiwFBVV95cUxOb3Vvc0ZYNVBHSlI5X2ZWOURHUTRFMU9EcG9jQ193dGEwdVBo';
const GN_SHELL = '<html><body><c-wiz><div data-n-a-id="x" data-n-a-ts="1791650042" data-n-a-sg="AbIaSL_eBbYV"></div></c-wiz></body></html>';
function batchBody(url: string): string {
    const inner = JSON.stringify(['garturlres', url, '']);
    return [")]}'", '', '123', JSON.stringify([['wrb.fr', 'Fbv4je', inner, null, null, null, 'generic']])].join('\n');
}

describe('googleNews', () => {
    it('parseGoogleNewsId：rss/articles 與 articles 皆可，非 Google News 回 null', () => {
        expect(parseGoogleNewsId(`https://news.google.com/rss/articles/${GN_ID}?oc=5`)).toBe(GN_ID);
        expect(parseGoogleNewsId(`https://news.google.com/articles/${GN_ID}`)).toBe(GN_ID);
        expect(parseGoogleNewsId('https://a.com/1')).toBeNull();
    });

    it('舊格式 id 離線解碼出原始 URL；新格式回 null', () => {
        const url = 'https://example.com/story?x=1';
        const payload = Buffer.from(url);
        const bytes = Buffer.concat([Buffer.from([0x08, 0x13, 0x22, payload.length]), payload, Buffer.from([0xd2, 0x01, 0x00])]);
        const id = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        expect(decodeLegacyGoogleNewsId(id)).toBe(url);
        expect(decodeLegacyGoogleNewsId(GN_ID)).toBeNull();
        expect(decodeLegacyGoogleNewsId('not-base64!!')).toBeNull();
    });

    it('parseBatchResponse 取 garturlres 的 URL', () => {
        expect(parseBatchResponse(batchBody('https://pub.com/story'))).toBe('https://pub.com/story');
        expect(parseBatchResponse('garbage')).toBeNull();
    });

    it('新格式：殼頁簽章 → batchexecute → 原始 URL；殼頁失敗回 null；非 Google News 原樣回傳', async () => {
        const fetchFn = fakeFetch({
            'https://news.google.com/articles/': GN_SHELL,
            'https://news.google.com/_/DotsSplashUi/data/batchexecute': batchBody('https://pub.com/story')
        });
        expect(await resolveGoogleNewsUrl(fetchFn, `https://news.google.com/rss/articles/${GN_ID}?oc=5`)).toBe('https://pub.com/story');
        expect(await resolveGoogleNewsUrl(fetchFn, 'https://a.com/x')).toBe('https://a.com/x');
        expect(await resolveGoogleNewsUrl(fakeFetch({}), `https://news.google.com/rss/articles/${GN_ID}`)).toBeNull();
        expect(await resolveGoogleNewsUrl(fakeFetch({ 'https://news.google.com/articles/': '<html>no sig</html>' }), `https://news.google.com/rss/articles/${GN_ID}`)).toBeNull();
    });
});

describe('candidates', () => {
    it('snippetUsable：過短或只是標題（Google News 的「標題 + 媒體名」）不可用', () => {
        const title = 'Kyrie Irving gets cryptic when asked about retiring with Mavericks';
        expect(snippetUsable(`${title} BasketNews.com`, title, 160)).toBe(false);
        expect(snippetUsable('short', title, 160)).toBe(false);
        expect(snippetUsable('A'.repeat(200), title, 160)).toBe(true);
    });

    it('Google News 連結還原：成功者換原始 URL + 媒體名並擷取；失敗者 failed 且不擷取', async () => {
        const good = `https://news.google.com/rss/articles/${GN_ID}?oc=5`;
        const bad = 'https://news.google.com/rss/articles/CBMiiwFBVV95cUxBQURfYmFk?oc=5';
        const requests: string[] = [];
        const fetchFn = fakeFetch(
            {
                'https://news.google.com/rss/search': rssXml([
                    { title: 'LeBron James says he will keep playing', link: good, description: 'LeBron James says he will keep playing  Yahoo Sports', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT', source: 'Yahoo Sports' },
                    { title: 'LeBron James injury update from the Lakers', link: bad, description: 'LeBron James injury update from the Lakers  ESPN', pubDate: 'Mon, 28 Sep 2026 05:00:00 GMT', source: 'ESPN' }
                ]),
                [`https://news.google.com/articles/${GN_ID}`]: GN_SHELL,
                'https://news.google.com/_/DotsSplashUi/data/batchexecute': batchBody('https://pub.com/story'),
                'https://pub.com/story': articleHtml('LeBron', LONG)
            },
            { onRequest: (url) => requests.push(url) }
        );

        const candidates = await collectCandidates({
            players: [{ id: 1, name: 'LeBron James' }],
            config: { ...DEFAULT_CONFIG, sources: [] },
            fetch: fetchFn,
            now: NOW,
            retry: { delayMs: 0 },
            logger: { warn: () => {} }
        });

        expect(candidates).toHaveLength(2);
        const ok = candidates.find((c) => c.sourceUrl === 'https://pub.com/story')!;
        expect(ok.sourceName).toBe('Yahoo Sports');
        expect(ok.extractStatus).toBe('ok');
        expect(ok.articleText).toContain('Paragraph 1');

        const failed = candidates.find((c) => c.sourceUrl.startsWith('https://news.google.com/rss/articles/'))!;
        expect(failed.extractStatus).toBe('failed');
        expect(failed.articleText).toBeNull();
        expect(requests.filter((u) => u.startsWith('https://news.google.com/rss/articles/'))).toHaveLength(0);

        // googleNewsResolve=false：全部 failed、不打殼頁
        requests.length = 0;
        const off = await collectCandidates({
            players: [{ id: 1, name: 'LeBron James' }],
            config: { ...DEFAULT_CONFIG, sources: [], googleNewsResolve: false },
            fetch: fetchFn,
            now: NOW,
            logger: { warn: () => {} }
        });
        expect(off.every((c) => c.extractStatus === 'failed')).toBe(true);
        expect(requests.filter((u) => u.startsWith('https://news.google.com/articles/'))).toHaveLength(0);
    });

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
