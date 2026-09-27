import type { Config } from 'tailwindcss';
import { TEAM_COLORS } from './src/constants/teamColors';

export default {
    darkMode: 'class',
    // 球隊色 class 以資料組出（bg-team-lal 等），需 safelist 保住
    safelist: [{ pattern: /^bg-team-/ }, { pattern: /^text-team-/ }],
    theme: {
        // 9D.5：圓角全域覆蓋為 0（像素風無圓角）
        borderRadius: {
            none: '0',
            sm: '0',
            DEFAULT: '0',
            md: '0',
            lg: '0',
            xl: '0',
            '2xl': '0',
            '3xl': '0',
            full: '0'
        },
        extend: {
            colors: {
                bg: 'var(--c-bg)',
                panel: 'var(--c-panel)',
                'panel-2': 'var(--c-panel-2)',
                head: 'var(--c-head)',
                line: 'var(--c-border)',
                'line-2': 'var(--c-border-2)',
                cream: 'var(--c-cream)',
                muted: 'var(--c-muted)',
                gold: 'var(--c-gold)',
                hp: 'var(--c-hp)',
                sp: 'var(--c-sp)',
                'tag-blue': 'var(--c-tag-blue)',
                'tag-brown': 'var(--c-tag-brown)',
                track: 'var(--c-track)',
                team: TEAM_COLORS
            },
            fontFamily: {
                sans: ['"Noto Sans TC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                // 像素中文：實作時載入 Fusion Pixel / Zpix subset（9D.3），先以 fallback 顯示
                pixel: ['"Fusion Pixel 12px"', 'Zpix', 'DotGothic16', '"Noto Sans TC"', 'monospace'],
                press: ['"Press Start 2P"', 'monospace']
            },
            // 9D.1：陰影只用硬陰影（radius 0, offset 4/4），不用模糊
            boxShadow: {
                hard: '4px 4px 0 0 rgb(0 0 0 / 0.45)',
                'hard-gold': '4px 4px 0 0 rgb(226 185 78 / 0.6)'
            }
        }
    }
} satisfies Partial<Config>;
