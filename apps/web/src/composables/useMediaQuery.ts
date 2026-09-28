/**
 * 媒體查詢監聽工具（自 fbcom 移植）。包裝 `window.matchMedia`，自動處理監聽器的建立與銷毀。
 * SSR-safe：初次 render 用 defaultValue，mount 後才讀 matchMedia，避免 hydration mismatch。
 * @example
 *   const { matches: isMobile } = useMediaQuery('(max-width: 767px)');
 */
import { onMounted, onUnmounted, ref } from 'vue';

interface UseMediaQueryOptions {
    defaultValue?: boolean;
}

export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}) {
    const matches = ref<boolean>(options.defaultValue ?? false);

    let mql: MediaQueryList | null = null;
    let handler: ((e: MediaQueryListEvent) => void) | null = null;

    const cleanup = () => {
        if (!mql || !handler) {
            return;
        }
        mql.removeEventListener('change', handler);
        handler = null;
        mql = null;
    };

    onMounted(() => {
        if (typeof window === 'undefined') {
            return;
        }
        mql = window.matchMedia(query);
        matches.value = mql.matches;
        handler = (e: MediaQueryListEvent) => {
            matches.value = e.matches;
        };
        mql.addEventListener('change', handler);
    });

    onUnmounted(() => {
        cleanup();
    });

    return { matches };
}
