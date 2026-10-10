import type { Player } from '~/types/api';

/** 30+ 名單 mock（依設計稿文案）。正式名單來自 seed/players-2026.json（TODO: Hank 校對）。 */
export const MOCK_PLAYERS: Player[] = [
    { id: 1, name: 'LeBron James', team: 'LAL', birthDate: '1984-12-30', season: 2026, active: true },
    { id: 2, name: 'Stephen Curry', team: 'GSW', birthDate: '1988-03-14', season: 2026, active: true },
    { id: 3, name: 'Kevin Durant', team: 'PHX', birthDate: '1988-09-29', season: 2026, active: true },
    { id: 4, name: 'James Harden', team: 'LAC', birthDate: '1989-08-26', season: 2026, active: true },
    { id: 5, name: 'Jimmy Butler', team: 'MIA', birthDate: '1989-09-14', season: 2026, active: true },
    { id: 6, name: 'Paul George', team: 'PHI', birthDate: '1990-05-02', season: 2026, active: true }
];

export function getMockPlayers(_params: Record<string, unknown>): Player[] {
    return MOCK_PLAYERS.filter((p) => p.active);
}
