/** Drizzle schema（計畫書 4.3；9A/9B 的表於對應里程碑再加）。 */
import {
    pgTable,
    serial,
    text,
    date,
    boolean,
    timestamp,
    integer,
    jsonb,
    real,
    index,
    uniqueIndex
} from 'drizzle-orm/pg-core';

export const players = pgTable(
    'players',
    {
        id: serial('id').primaryKey(),
        name: text('name').notNull(),
        team: text('team').notNull(),
        birthDate: date('birth_date').notNull(),
        season: integer('season').notNull(),
        active: boolean('active').notNull().default(true),
        source: text('source', { enum: ['seed', 'api'] })
            .notNull()
            .default('seed'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
    },
    // seed / roster 以 (name, team) upsert（4.5）。TODO(M8): 交易換隊時的處理
    (table) => [uniqueIndex('players_name_team_idx').on(table.name, table.team)]
);

export const banlist = pgTable('banlist', {
    playerId: integer('player_id')
        .primaryKey()
        .references(() => players.id),
    reason: text('reason'),
    bannedBy: text('banned_by'),
    bannedAt: timestamp('banned_at', { withTimezone: true }).notNull().defaultNow()
});

export const materials = pgTable(
    'materials',
    {
        id: serial('id').primaryKey(),
        playerId: integer('player_id')
            .notNull()
            .references(() => players.id),
        date: date('date').notNull(),
        sourceUrl: text('source_url').notNull(),
        sourceName: text('source_name'),
        publishedAt: timestamp('published_at', { withTimezone: true }),
        titleZh: text('title_zh').notNull(),
        summaryZh: text('summary_zh').notNull(),
        keyQuotes: jsonb('key_quotes').$type<string[]>().notNull().default([]),
        imageUrl: text('image_url'),
        tags: jsonb('tags').$type<string[]>().notNull().default([]),
        score: integer('score'),
        status: text('status', { enum: ['published', 'hidden'] })
            .notNull()
            .default('published'),
        tokensIn: integer('tokens_in'),
        tokensOut: integer('tokens_out'),
        batchId: text('batch_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        index('materials_player_created_idx').on(table.playerId, table.createdAt.desc()),
        index('materials_date_idx').on(table.date),
        uniqueIndex('materials_source_url_idx').on(table.sourceUrl)
    ]
);

export const runs = pgTable('runs', {
    date: date('date').primaryKey(),
    status: text('status', {
        enum: ['pending', 'fetching', 'generating', 'collecting', 'done', 'failed']
    }).notNull(),
    candidateCount: integer('candidate_count'),
    generatedCount: integer('generated_count'),
    batchId: text('batch_id'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true })
});

/**
 * 每日 run 的候選與原文（4.3 之外的補充，寫進 PR 假設清單）：
 * Cloud Run 縮到零，送出 Batch 的 process 在 collect 時已不存在；keyQuotes 比對（9C.2 B4）需要原文，
 * 故候選在 daily 階段落 DB，collect 以 customId 對回。
 */
export const runCandidates = pgTable(
    'run_candidates',
    {
        id: serial('id').primaryKey(),
        runDate: date('run_date')
            .notNull()
            .references(() => runs.date),
        playerId: integer('player_id')
            .notNull()
            .references(() => players.id),
        sourceUrl: text('source_url').notNull(),
        sourceName: text('source_name'),
        title: text('title').notNull(),
        snippet: text('snippet'),
        publishedAt: timestamp('published_at', { withTimezone: true }),
        articleText: text('article_text'),
        imageUrl: text('image_url'),
        score: integer('score'),
        selected: boolean('selected').notNull().default(false),
        /** `${date}:${id}`，Batch custom_id（4.5.1） */
        customId: text('custom_id'),
        status: text('status', { enum: ['candidate', 'submitted', 'inserted', 'rejected'] })
            .notNull()
            .default('candidate'),
        rejectReason: text('reject_reason'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        index('run_candidates_run_date_idx').on(table.runDate),
        uniqueIndex('run_candidates_custom_id_idx').on(table.customId)
    ]
);

export const config = pgTable('config', {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull()
});

export const usageLog = pgTable('usage_log', {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    /** 'scheduler' 或使用者 email */
    actor: text('actor').notNull(),
    model: text('model').notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    cacheRead: integer('cache_read').notNull().default(0),
    cacheWrite: integer('cache_write').notNull().default(0),
    costUsd: real('cost_usd').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
