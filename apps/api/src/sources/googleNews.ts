/**
 * Google News 連結還原（計畫書 4.4 步驟 4 補充，2026-10-11）。
 * Google News RSS 的 <link> 是 `news.google.com/rss/articles/<id>` 編碼連結，不是 HTTP 轉址，
 * 直接 fetch 只會拿到 JavaScript 跳轉的殼頁，擷取不到正文。
 *
 * 還原兩段式：
 * 1. 舊格式：id 為 base64，內含原始 URL，可離線解碼。
 * 2. 新格式（`AU_yqL…`）：GET 殼頁取 `data-n-a-ts` / `data-n-a-sg`，再 POST Google 內部 batchexecute 端點。
 *    非官方介面、可能隨時失效；失敗一律回 null，由呼叫端標 extractStatus=failed。
 */
import type { FetchLike } from './rss';

const ARTICLE_URL_RE = /^https?:\/\/news\.google\.com\/(?:rss\/)?articles\/([^/?#]+)/i;
const BATCHEXECUTE_URL = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';
const USER_AGENT = 'Mozilla/5.0 (compatible; nba-material-site/0.1)';

export function isGoogleNewsArticleUrl(url: string): boolean {
    return ARTICLE_URL_RE.test(url);
}

export function parseGoogleNewsId(url: string): string | null {
    const match = url.match(ARTICLE_URL_RE);
    return match ? match[1] : null;
}

function base64UrlDecode(id: string): Buffer {
    const normalized = id.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64');
}

/** protobuf varint */
function readVarint(bytes: Buffer, offset: number): { value: number; next: number } | null {
    let value = 0;
    let shift = 0;
    let pos = offset;
    while (pos < bytes.length && shift <= 28) {
        const byte = bytes[pos++];
        value |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) {
            return { value, next: pos };
        }
        shift += 7;
    }
    return null;
}

/**
 * 舊格式離線解碼：bytes = 0x08 0x13 0x22 <varint len> <payload> …
 * payload 以 http 開頭即為原始 URL；以 `AU_yqL` 開頭為新格式，需線上還原。
 */
export function decodeLegacyGoogleNewsId(id: string): string | null {
    let bytes: Buffer;
    try {
        bytes = base64UrlDecode(id);
    } catch {
        return null;
    }
    if (bytes.length < 4 || bytes[0] !== 0x08 || bytes[1] !== 0x13 || bytes[2] !== 0x22) {
        return null;
    }
    const len = readVarint(bytes, 3);
    if (!len || len.next + len.value > bytes.length) {
        return null;
    }
    const payload = bytes.subarray(len.next, len.next + len.value).toString('utf8');
    if (/^https?:\/\//i.test(payload)) {
        return payload;
    }
    return null;
}

export interface ResolveOptions {
    timeoutMs?: number;
}

function pickAttr(html: string, name: string): string | null {
    const match = html.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : null;
}

function buildBatchBody(id: string, timestamp: string, signature: string): string {
    const request = JSON.stringify([
        'garturlreq',
        [
            ['en-US', 'US', ['FINANCE_TOP_INDICES', 'WEB_TEST_1_0_0'], null, null, 1, 1, 'US:en', null, 180, null, null, null, null, null, 0, null, null, [1608992183, 723341000]],
            'en-US',
            'US',
            1,
            [2, 3, 4, 8],
            1,
            0,
            '655000234',
            0,
            0,
            null,
            0
        ],
        id,
        Number(timestamp),
        signature
    ]);
    const freq = JSON.stringify([[['Fbv4je', request, null, 'generic']]]);
    return `f.req=${encodeURIComponent(freq)}`;
}

/** batchexecute 回應為 `)]}'` 前綴 + JSON 字串巢狀；只取 garturlres 後的 URL。 */
export function parseBatchResponse(body: string): string | null {
    const unescaped = body.split('\\"').join('"').split('\\/').join('/');
    const match = unescaped.match(/"garturlres","(https?:\/\/[^"]+)"/);
    if (match) {
        return match[1];
    }
    const fallback = unescaped.match(/"(https?:\/\/(?!news\.google\.com)[^"\s]+)"/);
    return fallback ? fallback[1] : null;
}

async function fetchWithTimeout(fetchFn: FetchLike, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetchFn(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 還原 Google News 文章連結為原始媒體 URL；非 Google News 連結原樣回傳；失敗回 null。
 */
export async function resolveGoogleNewsUrl(fetchFn: FetchLike, url: string, options: ResolveOptions = {}): Promise<string | null> {
    const id = parseGoogleNewsId(url);
    if (!id) {
        return url;
    }
    const legacy = decodeLegacyGoogleNewsId(id);
    if (legacy) {
        return legacy;
    }

    const timeoutMs = options.timeoutMs ?? 10_000;
    try {
        const page = await fetchWithTimeout(
            fetchFn,
            `https://news.google.com/articles/${id}?hl=en-US&gl=US&ceid=US:en`,
            { headers: { 'user-agent': USER_AGENT }, redirect: 'follow' },
            timeoutMs
        );
        if (!page.ok) {
            return null;
        }
        const html = await page.text();
        const timestamp = pickAttr(html, 'data-n-a-ts');
        const signature = pickAttr(html, 'data-n-a-sg');
        if (!timestamp || !signature) {
            return null;
        }

        const res = await fetchWithTimeout(
            fetchFn,
            BATCHEXECUTE_URL,
            {
                method: 'POST',
                headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: buildBatchBody(id, timestamp, signature)
            },
            timeoutMs
        );
        if (!res.ok) {
            return null;
        }
        return parseBatchResponse(await res.text());
    } catch {
        return null;
    }
}
