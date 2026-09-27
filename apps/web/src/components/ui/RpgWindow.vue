<!--
  @file RpgWindow.vue
  @description RPG 狀態視窗（9D.4 Window）：面板色 + 2px 金邊 + 標題列（像素字 + 三色裝飾方塊）。
  @param title - 標題列文字（像素字）；不傳且無 header slot 時不渲染標題列
  @param variant - default = 主視窗（panel 底 + 金邊）；inner = 內層子視窗（panel-2 底 + 次邊框，無裝飾方塊）
  @param bodyClass - 內容區額外 class（預設 p-4）
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title?: string;
    variant?: 'default' | 'inner';
    bodyClass?: string;
}>();

const isInner = computed(() => props.variant === 'inner');
</script>

<template>
    <section
        class="border-2"
        :class="isInner ? 'border-line-2 bg-panel-2' : 'border-line bg-panel shadow-hard'"
    >
        <header
            v-if="title || $slots.header"
            class="flex items-center justify-between px-4 py-2"
            :class="isInner ? 'bg-panel-2' : 'bg-head'"
        >
            <slot name="header">
                <h2 class="font-pixel text-xl leading-none text-cream">{{ title }}</h2>
            </slot>
            <!-- 三色方塊（hp / gold / sp）為裝飾常數，不承載狀態（9D.1） -->
            <div v-if="!isInner" class="flex gap-1" aria-hidden="true">
                <span class="h-2.5 w-2.5 bg-hp" />
                <span class="h-2.5 w-2.5 bg-gold" />
                <span class="h-2.5 w-2.5 bg-sp" />
            </div>
        </header>
        <div :class="bodyClass ?? 'p-4'">
            <slot />
        </div>
    </section>
</template>
