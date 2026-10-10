/**
 * 前端 API 型別。與 packages/shared 的 Drizzle schema 對齊（4.3），
 * 但不直接 import drizzle 型別以免把 ORM 打進前端 bundle。
 * TODO(討論): 之後可在 shared 另出純 TS 的 DTO 型別供兩端共用。
 */

export interface Player {
    id: number;
    name: string;
    team: string;
    birthDate: string;
    season: number;
    active: boolean;
}

export type MaterialStatus = 'published' | 'hidden';

export interface Material {
    id: number;
    playerId: number;
    date: string;
    sourceUrl: string;
    sourceName: string | null;
    publishedAt: string | null;
    titleZh: string;
    summaryZh: string;
    keyQuotes: string[];
    imageUrl: string | null;
    tags: string[];
    score: number | null;
    status: MaterialStatus;
    createdAt: string;
}

export interface Paginated<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}

export interface MaterialsQuery {
    playerId?: number;
    from?: string;
    to?: string;
    source?: string;
    page?: number;
}

/** 後端統一回傳封包（Hono，第 9 步實作） */
export type ApiEnvelope<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; issues?: unknown } };
