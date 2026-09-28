/**
 * 候選收集（計畫書 4.4 步驟 3–4）：
 * 每位球員 Google News RSS + 固定 RSS（標題/摘要含球員姓名）→ 英文 → 近 freshnessHours →
 * URL 正規化去重 → 標題相似度去重 → 原文擷取（並發 5，失敗改用 RSS 摘要）。
 */
import { dedupeByTitle, dedupeByUrl, normalizeUrl, type AppConfig } from '@nba/shared';
import { fetchFeed, googleNewsUrl, type FetchLike, type RssItem } from './rss';
import { extractArticle } from './extract';
import type { RetryOptions } from './retry';

export interface CandidatePlayer {
    id: number;
    name: string;
}

export interface RawCandidate {
    playerId: number;
    sourceUrl: string;
    sourceName: string;
    title: string;
    snippet: string;
    publishedAt: Date | null;
    articleText: string | null;
    imageUrl: string | null;
}

export interface CollectOptions {
    players: CandidatePlayer[];
    config: Pick<AppConfig, 'sources' | 'freshnessHours' | 'articleMaxChars'>;
    fetch: FetchLike;
    now: Date;
    concurrency?: number;
    retry?: RetryOptions;
    /** 跳過原文擷取（測試或快速模式） */
    skipExtract?: boolean;
    logger?: Pick<Console, 'warn'>;
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
            raw.push(toRaw(player.id, 'Google News', item));
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
    const byUrl = dedupeByUrl(filtered);
    const deduped = dedupeByTitle(byUrl);

    if (options.skipExtract) {
        return deduped;
    }

    return mapWithConcurrency(deduped, options.concurrency ?? 5, async (candidate) => {
        const extracted = await extractArticle(fetchFn, candidate.sourceUrl, options.retry);
        if (!extracted) {
            return candidate; // 只用 RSS 摘要
        }
        return {
            ...candidate,
            articleText: extracted.text.slice(0, config.articleMaxChars),
            imageUrl: candidate.imageUrl ?? extracted.imageUrl
        };
    });
}

function toRaw(playerId: number, sourceName: string, item: RssItem): RawCandidate {
    // TODO(討論): Google News 連結為轉址 URL；目前直接以轉址 URL 去重與擷取（fetch redirect: follow）
    return {
        playerId,
        sourceUrl: normalizeUrl(item.link),
        sourceName,
        title: item.title,
        snippet: item.snippet.slice(0, 600),
        publishedAt: item.publishedAt,
        articleText: null,
        imageUrl: item.imageUrl
    };
}
