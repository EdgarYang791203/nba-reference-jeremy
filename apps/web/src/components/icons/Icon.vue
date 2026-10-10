<!--
  @file Icon.vue
  @description 內嵌 SVG 圖示（stroke = currentColor）。像素風卡匣圖示（9E.1）之後以 16×16 手繪 SVG 加入。
  @param name - 圖示名稱（見 PATHS）
  @param size - 尺寸 px，預設 20
-->
<script setup lang="ts">
import { computed } from 'vue';

const PATHS: Record<string, string> = {
    'chevron-left': 'M15 18l-6-6 6-6',
    'chevron-right': 'M9 18l6-6-6-6',
    'chevron-up': 'M18 15l-6-6-6 6',
    'chevron-down': 'M6 9l6 6 6-6',
    close: 'M18 6L6 18M6 6l12 12',
    external: 'M7 17L17 7M8 7h9v9',
    home: 'M3 11l9-8 9 8M5 10v10h14V10',
    ellipsis: 'M5 12h.01M12 12h.01M19 12h.01'
};

const props = defineProps<{
    name: string;
    size?: number;
}>();

const path = computed(() => PATHS[props.name] ?? '');
const resolvedSize = computed(() => props.size ?? 20);
</script>

<template>
    <svg
        :width="resolvedSize"
        :height="resolvedSize"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="name === 'ellipsis' ? 3 : 2"
        stroke-linecap="square"
        aria-hidden="true"
    >
        <path :d="path" />
    </svg>
</template>
