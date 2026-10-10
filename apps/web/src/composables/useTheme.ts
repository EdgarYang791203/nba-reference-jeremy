/**
 * 主題切換：暗版（AI Console 夜間控制室，預設）／亮版（日間球場）。
 * 只換 :root[data-theme] 的變數表（tokens.css），標記不變。
 * SSR 一律 dark；client mount 後讀 localStorage 再套用（app.head 內另有 inline script 先套一次避免閃爍）。
 */
import { computed, onMounted } from 'vue';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') {
        return;
    }
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
}

function readStoredTheme(): Theme | null {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
        return null;
    }
}

export function useTheme() {
    // SSR 一律 dark；client 第一次建立 state 時直接讀 localStorage，避免 hydration 後被 head htmlAttrs 蓋回 dark
    const theme = useState<Theme>('theme', () => (import.meta.client ? (readStoredTheme() ?? 'dark') : 'dark'));

    // html 的 data-theme / class 交給 unhead 依 state 渲染（nuxt.config 不再寫死），切換時同步更新
    useHead({
        htmlAttrs: {
            'data-theme': computed(() => theme.value),
            class: computed(() => (theme.value === 'dark' ? 'dark' : ''))
        }
    });

    function setTheme(next: Theme) {
        theme.value = next;
        applyTheme(next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            /* private mode 等情境忽略 */
        }
    }

    function toggleTheme() {
        setTheme(theme.value === 'dark' ? 'light' : 'dark');
    }

    onMounted(() => {
        const stored = readStoredTheme();
        if (stored && stored !== theme.value) {
            theme.value = stored;
        }
        applyTheme(theme.value);
    });

    return { theme, setTheme, toggleTheme };
}
