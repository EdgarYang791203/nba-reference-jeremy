/** 30+ 名單（計畫書 4.2）：active 且依賽季基準日滿 minAge，扣掉 ban list。排程與 GET /api/players 共用。 */
import { getSeasonCutoffDate, isEligible, type AppConfig } from '@nba/shared';
import type { Repos } from '../repos';
import type { PlayerRow } from '../repos/players';

export function createPlayersService(repos: Repos) {
    return {
        async listEligible(config: AppConfig, now: Date): Promise<PlayerRow[]> {
            const cutoff = getSeasonCutoffDate(now, config.seasonOpening);
            const [players, banned] = await Promise.all([repos.players.listActive(), repos.banlist.idSet()]);
            return players.filter((p) => !banned.has(p.id) && isEligible({ birthDate: p.birthDate, active: p.active }, cutoff, config.minAge));
        },

        async eligibleIdSet(config: AppConfig, now: Date): Promise<Set<number>> {
            const players = await this.listEligible(config, now);
            return new Set(players.map((p) => p.id));
        }
    };
}

export type PlayersService = ReturnType<typeof createPlayersService>;
