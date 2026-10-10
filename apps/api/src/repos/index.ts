import type { Db } from './db';
import { createPlayersRepo } from './players';
import { createBanlistRepo } from './banlist';
import { createMaterialsRepo } from './materials';
import { createRunsRepo } from './runs';
import { createCandidatesRepo } from './candidates';
import { createConfigRepo } from './config';
import { createUsageRepo } from './usage';

/** 所有 Drizzle 存取集中於此（計畫書 3.2）；services 只透過這組介面碰 DB。 */
export function createRepos(db: Db) {
    return {
        players: createPlayersRepo(db),
        banlist: createBanlistRepo(db),
        materials: createMaterialsRepo(db),
        runs: createRunsRepo(db),
        candidates: createCandidatesRepo(db),
        config: createConfigRepo(db),
        usage: createUsageRepo(db)
    };
}

export type Repos = ReturnType<typeof createRepos>;
