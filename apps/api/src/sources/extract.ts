/**
 * 原文擷取（計畫書 4.4 步驟 4）：`@extractus/article-extractor` → fallback `@mozilla/readability` + linkedom → null。
 * 不用 headless browser；每篇最多重試 2 次；失敗回 null 讓呼叫端改用 RSS 摘要。
 */
import { extractFromHtml } from '@extractus/article-extractor';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import type { FetchLike } from './rss';
import { retry, type RetryOptions } from './retry';

export interface ExtractedArticle {
    text: string;
    imageUrl: string | null;
    title: string | null;
}

function htmlToText(html: string): string {
    return html
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<\/(p|div|br|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n\n')
        .trim();
}

export async function extractFromHtmlString(html: string, url: string): Promise<ExtractedArticle | null> {
    try {
        const article = await extractFromHtml(html, url);
        if (article?.content) {
            const text = htmlToText(article.content);
            if (text.length > 200) {
                return { text, imageUrl: article.image || null, title: article.title || null };
            }
        }
    } catch {
        /* fall through to readability */
    }

    try {
        const { document } = parseHTML(html);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = new Readability(document as any).parse();
        if (parsed?.textContent && parsed.textContent.trim().length > 200) {
            return {
                text: parsed.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim(),
                imageUrl: null,
                title: parsed.title || null
            };
        }
    } catch {
        /* give up */
    }

    return null;
}

export async function extractArticle(
    fetchFn: FetchLike,
    url: string,
    options: RetryOptions & { timeoutMs?: number } = {}
): Promise<ExtractedArticle | null> {
    const timeoutMs = options.timeoutMs ?? 15_000;
    try {
        return await retry(async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetchFn(url, {
                    headers: { 'user-agent': 'Mozilla/5.0 (compatible; nba-material-site/0.1)' },
                    signal: controller.signal,
                    redirect: 'follow'
                });
                if (!res.ok) {
                    throw new Error(`article ${url} responded ${res.status}`);
                }
                const html = await res.text();
                const extracted = await extractFromHtmlString(html, url);
                if (!extracted) {
                    throw new Error(`article ${url}: no extractable content`);
                }
                return extracted;
            } finally {
                clearTimeout(timer);
            }
        }, options);
    } catch {
        return null;
    }
}
