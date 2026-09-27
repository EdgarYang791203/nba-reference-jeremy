<!--
  @file GlobalLoading.vue
  @description 全域 loading 遮罩，由 global store 的計數器控制（自 fbcom 移植、改 RPG 風）。
  點擊遮罩可強制解除（防 API 卡住鎖死畫面）。
-->
<script lang="ts" setup>
import { useGlobalStore } from '~/stores/global';

const globalStore = useGlobalStore();
</script>

<template>
    <div
        v-if="globalStore.globalLoading"
        class="fixed left-0 top-0 z-[1000] flex h-screen w-full items-center justify-center bg-black/40"
        @click="globalStore.forceStopLoading()"
    >
        <div class="border-2 border-line bg-panel-2 px-6 py-4 shadow-hard">
            <span class="font-press text-xs uppercase text-gold">
                Loading<span class="rpg-blink" aria-hidden="true">_</span>
            </span>
        </div>
    </div>
</template>
