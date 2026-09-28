/** 可注入的假 fetch：以 URL 前綴對應回應（字串 = 200 text/html|xml；物件可指定 status）。 */
import type { FetchLike } from '../../src/sources/rss';

export type FakeRoute = string | { status?: number; body?: string; contentType?: string };

export function fakeFetch(routes: Record<string, FakeRoute>, options: { onRequest?: (url: string) => void } = {}): FetchLike {
    return async (input) => {
        options.onRequest?.(input);
        const key = Object.keys(routes).find((prefix) => input.startsWith(prefix));
        if (!key) {
            return new Response('not found', { status: 404 });
        }
        const route = routes[key];
        if (typeof route === 'string') {
            return new Response(route, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response(route.body ?? '', {
            status: route.status ?? 200,
            headers: { 'content-type': route.contentType ?? 'text/html' }
        });
    };
}

export function rssXml(items: Array<{ title: string; link: string; description?: string; pubDate: string }>): string {
    const body = items
        .map(
            (i) => `<item><title><![CDATA[${i.title}]]></title><link>${i.link}</link><description><![CDATA[${i.description ?? ''}]]></description><pubDate>${i.pubDate}</pubDate></item>`
        )
        .join('');
    return `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${body}</channel></rss>`;
}

export function articleHtml(title: string, paragraphs: string[]): string {
    return `<!doctype html><html><head><title>${title}</title></head><body><article><h1>${title}</h1>${paragraphs
        .map((p) => `<p>${p}</p>`)
        .join('')}</article></body></html>`;
}
