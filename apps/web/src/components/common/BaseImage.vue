<!--
  @file BaseImage.vue
  @description 基礎圖片元件（自 fbcom 移植）。錯誤時先切 fallbackSrc（9E.3：卡片縮圖 @error 切像素底圖），
  fallback 也失敗才隱藏並 emit error。像素圖以 pixel prop 套 .pixel-asset（不經重採樣）。
  @param src - 圖片來源（素材圖皆為外連 URL）
  @param alt - 替代文字
  @param fallbackSrc - 載入失敗時的替補圖（如 /pixel/thumb-shot-neon-610.jpg）
  @param pixel - 是否為像素素材（套 image-rendering: pixelated）
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
    src: string | null | undefined;
    alt?: string;
    fallbackSrc?: string;
    pixel?: boolean;
}>();

const emit = defineEmits<{
    (e: 'error', event?: Event): void;
    (e: 'load', event: Event): void;
    (e: 'fallback'): void;
}>();

const imageRef = ref<HTMLImageElement | null>(null);
const visible = ref(true);
const usingFallback = ref(false);
const mounted = ref(false);

const normalizedSrc = computed(() => {
    if (typeof props.src === 'string') {
        return props.src.trim();
    }
    return '';
});

const resolvedSrc = computed(() =>
    usingFallback.value ? (props.fallbackSrc ?? '') : normalizedSrc.value
);

function handleFailure(event?: Event) {
    if (!usingFallback.value && props.fallbackSrc) {
        usingFallback.value = true;
        emit('fallback');
        return;
    }
    visible.value = false;
    emit('error', event);
}

/** SSR 後 hydration 時 <img> 可能已 complete，error 事件不會再觸發，需從 DOM 補判斷 */
function syncImageStateFromDom() {
    const image = imageRef.value;
    if (!image || !resolvedSrc.value) {
        return;
    }

    if (!image.complete) {
        return;
    }

    if (image.naturalWidth > 0) {
        visible.value = true;
        return;
    }

    handleFailure();
}

watch(normalizedSrc, (nextSrc) => {
    visible.value = Boolean(nextSrc);
    usingFallback.value = false;

    if (mounted.value) {
        queueMicrotask(syncImageStateFromDom);
    }
});

onMounted(() => {
    mounted.value = true;
    syncImageStateFromDom();
});

function onLoad(event: Event) {
    emit('load', event);
}

function onError(event: Event) {
    handleFailure(event);
}
</script>

<template>
    <img
        v-if="visible && resolvedSrc"
        ref="imageRef"
        :src="resolvedSrc"
        :alt="alt"
        :class="{ 'pixel-asset': pixel }"
        decoding="async"
        @load="onLoad"
        @error="onError"
    />
</template>
