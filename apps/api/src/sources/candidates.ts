/**
 * 候選收集（計畫書 4.4 步驟 3–4）：
 * 每位球員 Google News RSS + 固定 RSS（標題/摘要含球員姓名）→ 英文 → 近 freshnessHours →
 * URL 正規化去重 → 標題相似度去重 → Google News 連結還原（googleNews.ts）→ 再去重 →
 * 原文擷取（並發 5）。
 *
 * extractStatus（2026-10-11 補充）：
 * - ok：擷取到正文
 * - rss_only：擷取失敗但 RSS 摘要 ≥ config.minSnippetChars，仍可進階段 A/B
 * - failed：無可用文字（Google News 還原失敗、或摘要只有標題），不進階段 A/B
 */
import { dedupeByTitle, dedupeByUrl, normalizeUrl, type AppConfig } from '@nba/shared';
import { fetchFeed, googleNewsUrl, type FetchLike, type RssItem } from './rss';
import { extractArticle } from './extract';
import { isGoogleNewsArticleUrl, resolveGoogleNewsUrl } from './googleNews';
import type { RetryOptions } from './retry';

export interface CandidatePlayer {
    id: number;
    name: string;
}

export type ExtractStatus = 'ok' | 'rss_only' | 'failed';

export interface RawCandidate {
    playerId: number;
    sourceUrl: string;
    sourceName: string;
    title: string;
    snippet: string;
    publishedAt: Date | null;
    articleText: string | null;
    imageUrl: string | null;
    extractStatus: ExtractStatus;
}

export interface CollectOptions {
    players: CandidatePlayer[];
    config: Pick<AppConfig, 'sources' | 'freshnessHours' | 'articleMaxChars' | 'minSnippetChars' | 'googleNewsResolve'>;
    fetch: FetchLike;
    now: Date;
    concurrency?: number;
    retry?: RetryOptions;
    /** 跳過原文擷取（測試或快速模式）；extractStatus 依摘要長度判定 */
    skipExtract?: boolean;
    logger?: Pick<Console, 'warn'>;
}

export interface ExtractStats {
    ok: number;
    rssOnly: number;
    failed: number;
}

/** 英文判斷：標題 ASCII 比例（TODO(討論): 改用語言偵測套件） */
export function looksEnglish(title: string): boolean {
    if (!title) {
        return false;
    }
    const ascii = title.replace(/[^\x20-\x7e]/g, '').length;
    return ascii / title.length >= 0.9;
}

export function isFresh(publishedAt: Date | null, now: Date, freshnessHours: number): boolean {
    if (!publishedAt) {
        return false;
    }
    const ageMs = now.getTime() - publishedAt.getTime();
    return ageMs >= -60 * 60 * 1000 && ageMs <= freshnessHours * 60 * 60 * 1000;
}

/** 摘要是否只是標題（含 Google News 的「標題 + 媒體名」）或過短 */
export function snippetUsable(snippet: string, title: string, minChars: number): boolean {
    const s = snippet.trim();
    if (s.length < minChars) {
        return false;
    }
    const t = title.trim().toLowerCase();
    return !(t && s.toLowerCase().startsWith(t) && s.length - t.length < 40);
}

export function summarizeExtract(candidates: Array<Pick<RawCandidate, 'extractStatus'>>): ExtractStats {
    const stats: ExtractStats = { ok: 0, rssOnly: 0, failed: 0 };
    for (const c of candidates) {
        if (c.extractStatus === 'ok') {
            stats.ok++;
        } else if (c.extractStatus === 'rss_only') {
            stats.rssOnly++;
        } else {
            stats.failed++;
        }
    }
    return stats;
}

function mentionsPlayer(item: RssItem, name: string): boolean {
    const haystack = `${item.title} ${item.snippet}`.toLowerCase();
    const full = name.toLowerCase();
    const last = full.split(' ').pop() ?? full;
    return haystack.includes(full) || (last.length > 3 && haystack.includes(last));
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

export async function collectCandidates(options: CollectOptions): Promise<RawCandidate[]> {
    const { players, config, fetch: fetchFn, now } = options;
    const logger = options.logger ?? console;
    const concurrency = options.concurrency ?? 5;

    // 固定 RSS 只抓一次，再依球員姓名分配
    const fixedFeeds = await Promise.all(
        config.sources.map(async (source) => {
            try {
                return { name: source.name, items: await fetchFeed(fetchFn, source.url) };
            } catch (error) {
                logger.warn(`[sources] feed ${source.name} failed: ${(error as Error).message}`);
                return { name: source.name, items: [] as RssItem[] };
            }
        })
    );

    const raw: RawCandidate[] = [];
    for (const player of players) {
        let googleItems: RssItem[] = [];
        try {
            googleItems = await fetchFeed(fetchFn, googleNewsUrl(player.name));
        } catch (error) {
            logger.warn(`[sources] google news for ${player.name} failed: ${(error as Error).message}`);
        }
        for (const item of googleItems) {
            raw.push(toRaw(player.id, item.publisher || 'Google News', item));
        }
        for (const feed of fixedFeeds) {
            for (const item of feed.items) {
                if (mentionsPlayer(item, player.name)) {
                    raw.push(toRaw(player.id, feed.name, item));
                }
            }
        }
    }

    const filtered = raw.filter((c) => c.sourceUrl && looksEnglish(c.title) && isFresh(c.publishedAt, now, config.freshnessHours));
    const deduped = dedupeByTitle(dedupeByUrl(filtered));

    // Google News 連結還原：成功者換成原始媒體 URL（之後再去重一次）；失敗者標 failed、不擷取
    const resolved = await mapWithConcurrency(deduped, concurrency, async (candidate) => {
        if (!isGoogleNewsArticleUrl(candidate.sourceUrl)) {
            return candidate;
        }
        if (!config.googleNewsResolve) {
            return { ...candidate, extractStatus: 'failed' as const };
        }
        const original = await resolveGoogleNewsUrl(fetchFn, candidate.sourceUrl);
        if (!original || isGoogleNewsArticleUrl(original)) {
            logger.warn(`[sources] google news resolve failed: ${candidate.title.slice(0, 60)}`);
            return { ...candidate, extractStatus: 'failed' as const };
        }
        return { ...candidate, sourceUrl: normalizeUrl(original) };
    });
    const unique = dedupeByUrl(resolved);

    return mapWithConcurrency(unique, concurrency, async (candidate) => {
        if (candidate.extractStatus === 'failed') {
            return candidate;
        }
        const extracted = options.skipExtract ? null : await extractArticle(fetchFn, candidate.sourceUrl, options.retry);
        if (!extracted) {
            // 只用 RSS 摘要；摘要不可用（只有標題）則 failed
            const usable = snippetUsable(candidate.snippet, candidate.title, config.minSnippetChars);
            return { ...candidate, extractStatus: usable ? 'rss_only' : 'failed' };
        }
        return {
            ...candidate,
            articleText: extracted.text.slice(0, config.articleMaxChars),
            imageUrl: candidate.imageUrl ?? extracted.imageUrl,
            extractStatus: 'ok'
        };
    });
}

function toRaw(playerId: number, sourceName: string, item: RssItem): RawCandidate {
    return {
        playerId,
        sourceUrl: normalizeUrl(item.link),
        sourceName,
        title: item.title,
        snippet: item.snippet.slice(0, 600),
        publishedAt: item.publishedAt,
        articleText: null,
        imageUrl: item.imageUrl,
        extractStatus: 'rss_only'
    };
}
