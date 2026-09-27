<!--
  @file StatBar.vue
  @description 數值條（9D.4 StatBar）：label（Press Start 2P）+ track（h-18 金邊）+ fill（內縮 2px）+ 像素數值。
  fill 寬度為連續動態值，依專案慣例不寫 :style，改以 ref 在 client 端設定。
  @param label - 左側標籤（HP / NEW 等，全大寫）
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
            return 'bg-sp';
        case 'gold':
            return 'bg-gold';
        default:
            return 'bg-hp';
    }
});
</script>

<template>
    <div class="flex items-center gap-3">
        <span class="font-press text-[10px] uppercase text-muted">{{ label }}</span>
        <div
            class="h-[18px] flex-1 border-2 border-line bg-track p-[2px]"
            role="meter"
            :aria-valuenow="value"
            :aria-valuemin="0"
            :aria-valuemax="max"
            :aria-label="label"
        >
            <div ref="fillRef" class="h-full w-0" :class="fillClass" />
        </div>
        <span class="font-pixel text-lg leading-none text-muted">{{ value }}/{{ max }}</span>
    </div>
</template>
