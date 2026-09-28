<!--
  @file StatBar.vue
  @description 數值條（DS StatBar）：label（Press Start 2P 10，寬 40）+ track（高 18，track 底，2px border）+ fill（內縮 2px，發光）+ 像素數值（number-sm 18，muted）。
  fill 寬度為連續動態值，依專案慣例不寫 :style，改以 ref 在 client 端設定。
  @param label - 左側標籤（HOT / NEW 等，全大寫）
  @param value / max - 數值與上限
  @param color - hp（預設）| sp | gold
-->
<script setup lang="ts">
import { computed, ref, watchPostEffect } from 'vue';

const props = defineProps<{
    label: string;
    value: number;
    max: number;
    color?: 'hp' | 'sp' | 'gold';
}>();

const percent = computed(() => {
    if (props.max <= 0) {
        return 0;
    }
    return Math.max(0, Math.min(100, (props.value / props.max) * 100));
});

const fillRef = ref<HTMLElement | null>(null);

watchPostEffect(() => {
    fillRef.value?.style.setProperty('width', `${percent.value}%`);
});

const fillClass = computed(() => {
    switch (props.color ?? 'hp') {
        case 'sp':
            return 'bg-sp text-sp';
        case 'gold':
            return 'bg-gold text-gold';
        default:
            return 'bg-hp text-hp';
    }
});
</script>

<template>
    <div class="flex items-center gap-3.5">
        <span class="w-10 shrink-0 font-press text-[10px] uppercase text-cream">{{ label }}</span>
        <div
            class="h-[18px] flex-1 border-2 border-line bg-track p-[2px]"
            role="meter"
            :aria-valuenow="value"
            :aria-valuemin="0"
            :aria-valuemax="max"
            :aria-label="label"
        >
            <div ref="fillRef" class="stat-fill h-full w-0" :class="fillClass" />
        </div>
        <span class="font-pixel text-lg leading-none text-muted">{{ value }}/{{ max }}</span>
    </div>
</template>

<style scoped>
.stat-fill {
    box-shadow: 0 0 10px currentColor;
}
</style>
