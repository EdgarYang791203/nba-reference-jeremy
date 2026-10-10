<!--
  @file Marquee.vue
  @description 終端跑馬燈（DS Marquee）：`nba@console:~$ tail -f today.log` + 像素字內容 + ▌ 游標。
  亮版為深色條 + shadow-prompt（設計稿 prompt 改 `nba@court`）。
  @param items - 要輪播的標題陣列（以 ▸ 串接）
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '~/composables/useTheme';

const props = defineProps<{
    items: string[];
}>();

const { theme } = useTheme();

const prompt = computed(() =>
    theme.value === 'light' ? 'nba@court:~$ tail -f today.log' : 'nba@console:~$ tail -f today.log'
);
const text = computed(() => (props.items.length ? props.items.join('  ▸  ') : '今日尚無新素材'));
</script>

<template>
    <div
        class="flex items-center gap-4 overflow-hidden border-2 border-line bg-panel-2 px-3.5 py-2.5"
        :class="theme === 'light' ? 'shadow-prompt' : ''"
        role="status"
        aria-live="polite"
    >
        <span class="shrink-0 font-mono text-[13px] font-bold text-gold">{{ prompt }}</span>
        <div class="marquee-track flex-1 overflow-hidden">
            <span class="marquee-text inline-block whitespace-nowrap font-pixel text-base text-cream">
                {{ text }}
            </span>
        </div>
        <span class="shrink-0 font-mono text-gold rpg-blink" aria-hidden="true">▌</span>
    </div>
</template>

<style scoped>
@keyframes marquee-scroll {
    from {
        transform: translateX(0);
    }
    to {
        transform: translateX(-100%);
    }
}
.marquee-text {
    padding-left: 100%;
    animation: marquee-scroll 40s linear infinite;
}
.marquee-track:hover .marquee-text {
    animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
    .marquee-text {
        padding-left: 0;
        animation: none;
    }
}
</style>
