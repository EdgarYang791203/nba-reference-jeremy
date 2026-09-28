/** RSS 2.0 / Atom 解析（fast-xml-parser）與 Google News 查詢 URL（計畫書 4.4 步驟 3）。 */
import { XMLParser } from 'fast-xml-parser';

export interface RssItem {
    title: string;
    link: string;
    /** 摘要／描述（去 HTML） */
    snippet: string;
    publishedAt: Date | null;
    /** feed 提供的圖片（enclosure / media:content） */
    imageUrl: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function googleNewsUrl(playerName: string): string {
    const q = encodeURIComponent(`"${playerName}" NBA`);
    return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '#cdata',
    textNodeName: '#text'
});

function text(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'object') {
        const v = value as Record<string, unknown>;
        return text(v['#cdata'] ?? v['#text'] ?? v['@_href'] ?? '');
    }
    return '';
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function toDate(value: unknown): Date | null {
    const s = text(value);
    if (!s) {
        return null;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

function asArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

function pickImage(item: Record<string, unknown>): string | null {
    const enclosure = item.enclosure as Record<string, unknown> | undefined;
    if (enclosure && typeof enclosure['@_url'] === 'string' && String(enclosure['@_type'] ?? '').startsWith('image')) {
        return enclosure['@_url'];
    }
    const media = (item['media:content'] ?? item['media:thumbnail']) as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const first = asArray(media)[0];
    if (first && typeof first['@_url'] === 'string') {
        return first['@_url'];
    }
    return null;
}

export function parseFeed(xml: string): RssItem[] {
    const doc = parser.parse(xml) as Record<string, unknown>;

    // RSS 2.0
    const rss = doc.rss as Record<string, unknown> | undefined;
    if (rss?.channel) {
        const channel = rss.channel as Record<string, unknown>;
        return asArray(channel.item as Record<string, unknown> | Record<string, unknown>[]).map((item) => ({
            title: stripHtml(text(item.title)),
            link: text(item.link).trim(),
            snippet: stripHtml(text(item.description ?? item['content:encoded'])),
            publishedAt: toDate(item.pubDate ?? item['dc:date']),
            imageUrl: pickImage(item)
        }));
    }

    // Atom
    const feed = doc.feed as Record<string, unknown> | undefined;
    if (feed?.entry) {
        return asArray(feed.entry as Record<string, unknown> | Record<string, unknown>[]).map((entry) => {
            const links = asArray(entry.link as Record<string, unknown> | Record<string, unknown>[]);
            const alternate = links.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? links[0];
            return {
                title: stripHtml(text(entry.title)),
                link: text(alternate?.['@_href'] ?? alternate).trim(),
                snippet: stripHtml(text(entry.summary ?? entry.content)),
                publishedAt: toDate(entry.published ?? entry.updated),
                imageUrl: pickImage(entry)
            };
        });
    }

    return [];
}

export async function fetchFeed(fetchFn: FetchLike, url: string): Promise<RssItem[]> {
    const res = await fetchFn(url, { headers: { 'user-agent': 'nba-material-site/0.1 (+rss)' } });
    if (!res.ok) {
        throw new Error(`feed ${url} responded ${res.status}`);
    }
    return parseFeed(await res.text());
}
