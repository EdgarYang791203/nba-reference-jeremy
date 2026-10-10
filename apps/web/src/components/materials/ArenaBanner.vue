<!--
  @file ArenaBanner.vue
  @description 球場像素橫幅（DS Banner，高 360）：像素底圖 → 主題壓暗漸層 → 左下 mono 小標 + 像素大標 + 三個 gold tag。
  依 9E.3：原生 <img>、.pixel-asset、Hero fetchpriority=high；src 依 data-theme 切換。
  @param stats - 三個統計標籤文字
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '~/composables/useTheme';
import RpgTag from '~/components/ui/RpgTag.vue';

defineProps<{
    stats: string[];
}>();

const { theme } = useTheme();
const src = computed(() =>
    theme.value === 'light' ? '/pixel/arena-day-1440.jpg' : '/pixel/arena-night-1440.jpg'
);
</script>

<template>
    <section class="relative h-[240px] overflow-hidden border-y-2 border-line md:h-[360px]">
        <img
            :src="src"
            alt=""
            class="pixel-asset absolute inset-0 h-full w-full object-cover object-[center_60%]"
            fetchpriority="high"
            decoding="async"
        />
        <div class="banner-overlay absolute inset-0" aria-hidden="true" />
        <div class="absolute bottom-6 left-4 flex flex-col gap-2.5 lg:bottom-9 lg:left-20">
            <span class="font-mono text-xs tracking-[1px] text-gold">// ARENA_FEED · 30 歲以上球員專區</span>
            <h1 class="font-pixel text-2xl leading-none text-cream md:text-[44px]">
                每日 05:00 巡邏外電，篩掉 ban 名單後上架摘要
            </h1>
            <div class="flex flex-wrap gap-2">
                <RpgTag v-for="stat in stats" :key="stat" color="gold">{{ stat }}</RpgTag>
            </div>
        </div>
    </section>
</template>

<style scoped>
.banner-overlay {
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--c-bg) 15%, transparent) 0%,
        color-mix(in srgb, var(--c-bg) 35%, transparent) 55%,
        color-mix(in srgb, var(--c-bg) 92%, transparent) 100%
    );
}
</style>
