/**
 * new badge（計畫書 4.2）：某球員有 createdAt 晚於訪客「上次瀏覽該頁籤時間」（localStorage）的素材即顯示 NEW，
 * 看過即消失，不需登入。SSR 不讀 localStorage，mounted 後才載入，避免 hydration mismatch。
 *
 * 規則：
 * - 從未看過該球員頁籤 → 近 3 天內的素材視為 NEW（避免第一次進站全部都 NEW）。
 * - 切到某球員頁籤時記錄「本次看到的時間」，但本次瀏覽期間仍以「上一次」為基準顯示 NEW（看過即消失＝下次進來才消失）。
 */
import { onMounted, ref, type Ref } from 'vue';

export const NEW_BADGE_STORAGE_PREFIX = 'materials:lastSeen:';
export const NEW_BADGE_FIRST_VISIT_DAYS = 3;

export type LastSeenMap = Record<string, string>;

/** 純函式：依上次瀏覽時間判斷是否為 NEW。 */
export function computeIsNew(
    createdAt: string,
    lastSeen: string | undefined,
    now: Date = new Date(),
    firstVisitDays: number = NEW_BADGE_FIRST_VISIT_DAYS
): boolean {
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) {
        return false;
    }
    if (!lastSeen) {
        return now.getTime() - created <= firstVisitDays * 24 * 60 * 60 * 1000;
    }
    return created > new Date(lastSeen).getTime();
}

export function readLastSeen(playerId: number | string): string | undefined {
    try {
        return localStorage.getItem(`${NEW_BADGE_STORAGE_PREFIX}${playerId}`) ?? undefined;
    } catch {
        return undefined;
    }
}

export function writeLastSeen(playerId: number | string, at: Date = new Date()): void {
    try {
        localStorage.setItem(`${NEW_BADGE_STORAGE_PREFIX}${playerId}`, at.toISOString());
    } catch {
        /* private mode 等情境忽略 */
    }
}

export function useNewBadge(playerIds: Ref<Array<number | string>>) {
    /** 本次瀏覽開始時的「上次看到」快照（顯示 NEW 的基準） */
    const baseline = ref<LastSeenMap>({});
    const loaded = ref(false);

    function load() {
        const next: LastSeenMap = {};
        for (const id of playerIds.value) {
            const seen = readLastSeen(id);
            if (seen) {
                next[String(id)] = seen;
            }
        }
        baseline.value = next;
        loaded.value = true;
    }

    function isNew(playerId: number | string, createdAt: string, now: Date = new Date()): boolean {
        if (!loaded.value) {
            return false;
        }
        return computeIsNew(createdAt, baseline.value[String(playerId)], now);
    }

    /** 切到該球員頁籤時呼叫：只更新 storage，不動 baseline（本次仍顯示 NEW） */
    function markSeen(playerId: number | string, at: Date = new Date()) {
        writeLastSeen(playerId, at);
    }

    onMounted(load);

    return { baseline, loaded, isNew, markSeen, reload: load };
}
