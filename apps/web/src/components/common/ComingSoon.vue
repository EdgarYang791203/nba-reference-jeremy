<!--
  @file ComingSoon.vue
  @description 尚未開放的固定路由佔位頁（/articles、/about、/issues/usage）。
  讓 header / footer 的 NuxtLink 有對應路由，避免 vue-router 警告與 prefetch 打 404 payload。
  @param title - 視窗標題（mono）
  @param milestone - 對應計畫書里程碑說明
-->
<script setup lang="ts">
import RpgWindow from '~/components/ui/RpgWindow.vue';
import AppLink from '~/components/common/AppLink.vue';

defineProps<{
    title: string;
    milestone: string;
}>();
</script>

<template>
    <div class="mx-auto max-w-[720px] px-4 py-16 lg:px-20">
        <RpgWindow :title="title" status="idle">
            <div class="flex flex-col gap-4 px-5 py-6">
                <p class="font-pixel text-2xl text-gold">COMING SOON_</p>
                <p class="text-sm leading-[22px] text-muted">{{ milestone }}</p>
                <AppLink href="/materials" class="font-mono text-sm text-gold hover:underline">▶ 回素材庫</AppLink>
            </div>
        </RpgWindow>
    </div>
</template>
