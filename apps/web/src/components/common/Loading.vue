<!--
  @file Loading.vue
  @description 全頁加載遮罩（自 fbcom 移植、改 RPG 風）：像素字 NOW LOADING + 閃爍游標。
  @example <Loading v-if="isLoading" />
-->
<template>
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
        <div class="border-2 border-line bg-panel px-8 py-6 text-center shadow-hard">
            <p class="font-press text-xs uppercase text-gold">
                Now Loading<span class="rpg-blink" aria-hidden="true">_</span>
            </p>
            <p class="mt-3 text-sm text-muted">頁面加載中…</p>
        </div>
    </div>
</template>
