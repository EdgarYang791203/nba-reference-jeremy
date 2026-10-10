/**
 * `pnpm seed`：讀 seed/players-2026.json，以 (name, team) upsert 到 players（計畫書 4.5）。
 * 需要 DATABASE_URL（本地一律 Neon dev branch）。
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { resolveDbFromEnv, type Db } from '../src/repos/db';
import { createRepos } from '../src/repos';

const seedSchema = z.object({
    season: z.number().int(),
    players: z.array(
        z.object({
            name: z.string().min(1),
            team: z.string().min(2).max(4),
            birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            active: z.boolean().optional()
        })
    )
});

export async function seedPlayers(db: Db, seedPath: string) {
    const raw = JSON.parse(await readFile(seedPath, 'utf8'));
    const seed = seedSchema.parse(raw);
    const repos = createRepos(db);
    const result = await repos.players.upsertByNameTeam(
        seed.players.map((p) => ({
            name: p.name,
            team: p.team.toUpperCase(),
            birthDate: p.birthDate,
            season: seed.season,
            active: p.active ?? true,
            source: 'seed' as const
        }))
    );
    return { season: seed.season, total: seed.players.length, ...result };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not set（本地請用 Neon dev branch）');
        process.exit(1);
    }
    const seedPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../seed/players-2026.json');
    resolveDbFromEnv(url).then((db) => seedPlayers(db, seedPath))
        .then((r) => {
            console.log(`seed ${r.season}: ${r.total} players → inserted ${r.inserted}, updated ${r.updated}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
