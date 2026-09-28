import type { Config } from 'tailwindcss';
import { TEAM_TAILWIND_COLORS } from './src/constants/teamColors';

export default {
    darkMode: 'class',
    // 球隊色 class 以資料組出（bg-team-lal 等），需 safelist 保住
    safelist: [{ pattern: /^bg-team-/ }, { pattern: /^text-team-/ }],
    theme: {
        // 圓角全域覆蓋為 0（DS radius-none：視窗、卡片、按鈕、標籤、輸入框一律 0）
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
                orange: 'var(--c-orange)',
                hp: 'var(--c-hp)',
                sp: 'var(--c-sp)',
                'tag-blue': 'var(--c-tag-blue)',
                'tag-brown': 'var(--c-tag-brown)',
                track: 'var(--c-track)',
                grid: 'var(--c-grid-line)',
                highlight: 'var(--c-highlight)',
                'on-gold': 'var(--c-on-gold)',
                'on-head': 'var(--c-on-head)',
                'on-tag-blue': 'var(--c-on-tag-blue)',
                'on-tag-brown': 'var(--c-on-tag-brown)',
                team: TEAM_TAILWIND_COLORS
            },
            fontFamily: {
                sans: [
                    '"Noto Sans TC"',
                    '"PingFang TC"',
                    '"Microsoft JhengHei"',
                    'system-ui',
                    'sans-serif'
                ],
                // 像素中文：實作時載入 Fusion Pixel / Zpix subset（DS type.families.pixel），先以 fallback 顯示
                pixel: [
                    '"Fusion Pixel 12px"',
                    'Zpix',
                    'DotGothic16',
                    '"Noto Sans TC"',
                    'sans-serif'
                ],
                press: ['"Press Start 2P"', 'Silkscreen', 'monospace'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
            },
            // DS shadow：硬陰影（offset 4/4、radius 0）+ 琥珀外光；不用模糊陰影
            boxShadow: {
                window: '4px 4px 0 0 var(--c-shadow-hard), 0 0 24px var(--c-glow)',
                card: '4px 4px 0 0 var(--c-shadow-hard)',
                'card-hover': '4px 4px 0 0 var(--c-shadow-hard), 0 0 20px var(--c-glow-strong)',
                prompt: '4px 4px 0 0 var(--c-gold)',
                tab: '0 0 16px var(--c-glow-strong)',
                // 舊名相容
                hard: '4px 4px 0 0 var(--c-shadow-hard)',
                'hard-gold': '4px 4px 0 0 var(--c-glow-strong)'
            },
            backgroundImage: {
                'console-grid':
                    'linear-gradient(var(--c-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-grid-line) 1px, transparent 1px)'
            },
            backgroundSize: {
                grid: '16px 16px'
            }
        }
    }
} satisfies Partial<Config>;
