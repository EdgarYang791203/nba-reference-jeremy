<!--
  @file StatBar.vue
  @description 數值條（DS StatBar）：label（Press Start 2P 10，寬 40）+ track（高 18，track 底，2px border）+ fill（內縮 2px，發光）+ 像素數值（number-sm 18，muted）。
  fill 以 SVG <rect width="n%"> 繪製：寬度是 SVG 屬性不是 inline style（符合不寫 :style 的慣例），
  且 SSR 就能輸出正確寬度，hydration 後不會從 0 長出來。
  @param label - 左側標籤（HOT / NEW 等，全大寫）
  @param value / max - 數值與上限；value 為 null 表示尚未就緒（如需 localStorage），顯示 `--` 且不填色
  @param color - hp（預設）| sp | gold
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    label: string;
    value: number | null;
    max: number;
    color?: 'hp' | 'sp' | 'gold';
}>();

const ready = computed(() => props.value !== null);

const percent = computed(() => {
    if (props.value === null || props.max <= 0) {
        return 0;
    }
    return Math.max(0, Math.min(100, (props.value / props.max) * 100));
});

const fillClass = computed(() => {
    switch (props.color ?? 'hp') {
        case 'sp':
            return 'fill-sp text-sp';
        case 'gold':
            return 'fill-gold text-gold';
        default:
            return 'fill-hp text-hp';
    }
});
</script>

<template>
    <div class="flex items-center gap-3.5">
        <span class="w-10 shrink-0 font-press text-[10px] uppercase text-cream">{{ label }}</span>
        <div
            class="h-[18px] flex-1 border-2 border-line bg-track p-[2px]"
            role="meter"
            :aria-valuenow="value ?? 0"
            :aria-valuemin="0"
            :aria-valuemax="max"
            :aria-label="label"
        >
            <svg class="stat-svg block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                <rect x="0" y="0" :width="`${percent}%`" height="100%" class="stat-fill" :class="fillClass" />
            </svg>
        </div>
        <span class="font-pixel text-lg leading-none text-muted">{{ ready ? value : '--' }}/{{ max }}</span>
    </div>
</template>

<style scoped>
.stat-fill {
    filter: drop-shadow(0 0 4px currentColor);
}
</style>
