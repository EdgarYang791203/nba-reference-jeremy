/**
 * 台北時區日期工具：runs.date / usage_log.date 與週預算窗口（6.1）皆以 Asia/Taipei 計算。
 * 台灣無日光節約時間，固定 UTC+8。
 */
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function toTaipei(now: Date): Date {
    return new Date(now.getTime() + TAIPEI_OFFSET_MS);
}

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD'（台北日期） */
export function taipeiDate(now: Date = new Date()): string {
    return ymd(toTaipei(now));
}

/** 台北時間自然週起算日（週一）'YYYY-MM-DD' */
export function taipeiWeekStart(now: Date = new Date()): string {
    const t = toTaipei(now);
    const dow = t.getUTCDay(); // 0 = Sunday
    const diffToMonday = (dow + 6) % 7;
    const monday = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - diffToMonday));
    return ymd(monday);
}

/** 台北時間月初 'YYYY-MM-01' */
export function taipeiMonthStart(now: Date = new Date()): string {
    const t = toTaipei(now);
    return ymd(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1)));
}

export function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function hoursBetween(a: Date, b: Date): number {
    return Math.abs(b.getTime() - a.getTime()) / (60 * 60 * 1000);
}
