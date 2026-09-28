/** 外電 URL 正規化去重（計畫書 4.4-3）：去 hash、去 tracking 參數、統一 host 大小寫與尾斜線。 */

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_cid|mc_eid|ref$|source$)/i;

export function normalizeUrl(rawUrl: string): string {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        return rawUrl.trim();
    }

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();

    const params = [...url.searchParams.keys()];
    for (const key of params) {
        if (TRACKING_PARAMS.test(key)) {
            url.searchParams.delete(key);
        }
    }
    url.searchParams.sort();

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
}

/** 以正規化後 URL 去重，保留先出現者。 */
export function dedupeByUrl<T extends { sourceUrl: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
        const key = normalizeUrl(item.sourceUrl);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(item);
    }
    return result;
}
