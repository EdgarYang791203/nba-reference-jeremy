/**
 * 年齡判定依賽季（計畫書 4.2）：
 * - 賽季中（10 月起至隔年 5 月）：以「該賽季開打日」是否滿 30 判定。
 * - 休賽季（6–9 月）：以「下賽季開打日」判定。
 * 全部用 UTC 計算，避免排程主機時區影響。
 */

export interface SeasonOpening {
    /** 開打月（1–12） */
    month: number;
    /** 開打日 */
    day: number;
}

/** 開打日逐年不同，預設 10/21；正式值由 config 表帶入。 */
export const DEFAULT_SEASON_OPENING: SeasonOpening = { month: 10, day: 21 };

/** 回傳今天適用的年齡判定基準日（該賽季或下賽季的開打日）。 */
export function getSeasonCutoffDate(
    today: Date,
    opening: SeasonOpening = DEFAULT_SEASON_OPENING
): Date {
    const month = today.getUTCMonth() + 1;
    const year = today.getUTCFullYear();

    // 10–12 月：本賽季（今年開打）；6–9 月：下賽季（今年 10 月開打）；
    // 1–5 月：進行中的賽季是去年開打的。
    const seasonYear = month >= 6 ? year : year - 1;
    return new Date(Date.UTC(seasonYear, opening.month - 1, opening.day));
}

/** 於基準日當下的足歲。 */
export function getAgeAt(birthDate: Date, at: Date): number {
    let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = at.getUTCMonth() - birthDate.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birthDate.getUTCDate())) {
        age -= 1;
    }
    return age;
}

export interface EligiblePlayer {
    birthDate: Date | string;
    active?: boolean;
}

/** 是否符合 30+（或 config.minAge）名單資格。 */
export function isEligible(player: EligiblePlayer, cutoff: Date, minAge = 30): boolean {
    if (player.active === false) {
        return false;
    }
    const birth =
        typeof player.birthDate === 'string' ? new Date(player.birthDate) : player.birthDate;
    if (Number.isNaN(birth.getTime())) {
        return false;
    }
    return getAgeAt(birth, cutoff) >= minAge;
}
