<!--
  @file RpgWindow.vue
  @description AI Console 視窗（DS 原則 2）：panel 底 + 2px border + head 標題列（mono 終端檔名 + ● 狀態點 + 三色裝飾方塊）+ 硬陰影與琥珀外光。
  @param title - 標題列文字（mono，寫成終端檔名如 `NBA_FEED — LeBron James [player_status.v1]`）
  @param status - 標題列左側狀態點：ok（sp）| idle（muted）| error（hp）| none（不顯示，預設）
  @param variant - default = 主視窗（panel + border + shadow-window）；inner = 內層子視窗（panel-2 + border，無標題列裝飾）
  @param pixelTitle - 標題改用像素字（頁面大標用）
  @param bodyClass - 內容區 class（預設 p-4）
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title?: string;
    status?: 'ok' | 'idle' | 'error' | 'none';
    variant?: 'default' | 'inner';
    pixelTitle?: boolean;
    bodyClass?: string;
}>();

const isInner = computed(() => props.variant === 'inner');

const statusClass = computed(() => {
    switch (props.status ?? 'none') {
        case 'ok':
            return 'text-sp';
        case 'idle':
            return 'text-muted';
        case 'error':
            return 'text-hp';
        default:
            return '';
    }
});
</script>

<template>
    <section
        class="border-2 border-line"
        :class="isInner ? 'bg-panel-2' : 'bg-panel shadow-window'"
    >
        <header
            v-if="title || $slots.header"
            class="flex items-center justify-between border-b-2 border-line px-3.5 py-2"
            :class="isInner ? 'bg-panel-2' : 'bg-head text-on-head'"
        >
            <slot name="header">
                <h2
                    class="flex items-center gap-2 leading-tight"
                    :class="
                        pixelTitle
                            ? 'font-pixel text-xl'
                            : 'font-mono text-[13px] tracking-[0.5px]'
                    "
                >
                    <span v-if="(status ?? 'none') !== 'none'" :class="statusClass" aria-hidden="true">
                        ●
                    </span>
                    <span>{{ title }}</span>
                </h2>
            </slot>
            <!-- 三色方塊（hp / gold / sp）為裝飾常數，不承載狀態 -->
            <div v-if="!isInner" class="flex gap-1.5" aria-hidden="true">
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
