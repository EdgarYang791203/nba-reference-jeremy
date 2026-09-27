<!--
  @file StatRow.vue
  @description 狀態列（9D.4 StatRow）：左標籤 + 右像素數值 + ▶，整行可點。
  @param label - 左側文字
  @param value - 右側數值（像素字）
  @param clickable - 整行是否可點（渲染 button 並顯示 ▶）
-->
<script setup lang="ts">
defineProps<{
    label: string;
    value: string | number;
    clickable?: boolean;
}>();

const emit = defineEmits<{
    click: [];
}>();
</script>

<template>
    <component
        :is="clickable ? 'button' : 'div'"
        :type="clickable ? 'button' : undefined"
        class="flex w-full items-center justify-between py-2"
        :class="clickable ? 'hover:bg-head' : ''"
        @click="clickable ? emit('click') : undefined"
    >
        <span class="text-base text-cream">{{ label }}</span>
        <span class="flex items-center gap-2">
            <span class="font-pixel text-2xl leading-none text-cream">{{ value }}</span>
            <span v-if="clickable" class="text-muted" aria-hidden="true">▶</span>
        </span>
    </component>
</template>
