/** 掛在 body/main 的捲動鎖定 class（定義於 assets/css/base.css）。
 *  用 classList 而非 el.style：DOM 上只留 class 屬性，不留 inline style（專案慣例）。 */
const SCROLL_LOCKED_CLASS = 'scroll-locked';

const tokens = new Set<string>();

function getMainEl(): HTMLElement | null {
    return (document.querySelector('main') as HTMLElement | null) ?? null;
}

function setLockedClass(locked: boolean) {
    const body = document.body;
    if (!body) {
        return;
    }

    body.classList.toggle(SCROLL_LOCKED_CLASS, locked);
    getMainEl()?.classList.toggle(SCROLL_LOCKED_CLASS, locked);
}

/**
 * Locks/unlocks page scroll (body + main) with token-based reference counting.
 *
 * - Call with a stable `token` per feature (e.g. 'agent-dialog').
 * - Multiple tokens can lock scroll simultaneously; unlock restores only when all tokens are released.
 */
export function setScrollLocked(token: string, locked: boolean) {
    if (!import.meta.client) {
        return;
    }

    if (!token) {
        return;
    }

    if (locked) {
        if (tokens.has(token)) {
            return;
        }

        tokens.add(token);
        setLockedClass(true);
        return;
    }

    if (!tokens.has(token)) {
        return;
    }

    tokens.delete(token);

    if (tokens.size === 0) {
        setLockedClass(false);
    }
}
