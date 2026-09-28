/** 日期小工具（前端顯示用；業務日期規則在 packages/shared）。 */

/** ISO / Date → 'YYYY-MM-DD'（以瀏覽器時區） */
export function formatDate(input: string | Date | null | undefined): string {
    if (!input) {
        return '';
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** 'MM/DD' */
export function formatMonthDay(input: string | Date | null | undefined): string {
    const full = formatDate(input);
    return full ? full.slice(5).replace('-', '/') : '';
}

/** 是否在最近 N 天內（含今天） */
export function isWithinDays(input: string | Date | null | undefined, days: number, now: Date = new Date()): boolean {
    if (!input) {
        return false;
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) {
        return false;
    }
    const diff = now.getTime() - d.getTime();
    return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

/** 以出生日算今日足歲 */
export function ageFrom(birthDate: string, now: Date = new Date()): number {
    const b = new Date(birthDate);
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
        age -= 1;
    }
    return age;
}

/** 1234 → '1.2k' */
export function compactNumber(n: number): string {
    if (n >= 1000) {
        return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(n);
}
