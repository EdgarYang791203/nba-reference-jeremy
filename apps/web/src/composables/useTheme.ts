/**
 * 主題切換：暗版（AI Console 夜間控制室，預設）／亮版（日間球場）。
 * 只換 :root[data-theme] 的變數表（tokens.css），標記不變。
 * SSR 一律 dark；client mount 後讀 localStorage 再套用（app.head 內另有 inline script 先套一次避免閃爍）。
 */
import { onMounted } from 'vue';

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
    const theme = useState<Theme>('theme', () => 'dark');

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
