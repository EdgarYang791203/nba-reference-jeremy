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

export const players = pgTable('players', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    team: text('team').notNull(),
    birthDate: date('birth_date').notNull(),
    season: integer('season').notNull(),
    active: boolean('active').notNull().default(true),
    source: text('source', { enum: ['seed', 'api'] })
        .notNull()
        .default('seed'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const banlist = pgTable('banlist', {
    playerId: integer('player_id')
        .primaryKey()
        .references(() => players.id),
    reason: text('reason'),
    bannedBy: text('banned_by'),
    bannedAt: timestamp('banned_at').notNull().defaultNow()
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
        publishedAt: timestamp('published_at'),
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
        createdAt: timestamp('created_at').notNull().defaultNow()
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
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at')
});

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
    createdAt: timestamp('created_at').notNull().defaultNow()
});
