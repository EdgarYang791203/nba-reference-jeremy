import type { Repos } from '../repos';
import { NotFoundError } from './errors';

export function createBanlistService(repos: Repos) {
    return {
        list() {
            return repos.banlist.listAll();
        },
        async add(playerId: number, reason: string | null, bannedBy: string) {
            const player = await repos.players.getById(playerId);
            if (!player) {
                throw new NotFoundError(`player ${playerId}`);
            }
            return repos.banlist.add(playerId, reason, bannedBy);
        },
        async remove(playerId: number) {
            const removed = await repos.banlist.remove(playerId);
            if (!removed) {
                throw new NotFoundError(`banlist entry ${playerId}`);
            }
        }
    };
}
