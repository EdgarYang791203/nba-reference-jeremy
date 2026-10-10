<!--
  @file MaterialCard.vue
  @description 素材卡（DS Card）：panel + 2px border + 硬陰影；16:9 縮圖（外連圖，失敗切像素底圖）；
  左上隊色 tag（+NEW gold），右上來源 tag；hover 邊框轉 gold + 外光並浮出「▶ 快速預覽」「♡ 收藏」；
  標題 card-title 兩行；meta = 日期 · 來源 + 瀏覽數（schema 無 views，先顯示 --）。
  @param material - 素材
  @param team - 球隊縮寫
  @param isNew - 是否顯示 NEW
  @param thumbIndex - fallback 縮圖輪替索引（1–4）
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Material } from '~/types/api';
import { formatDate } from '~/utils/date';
import BaseImage from '~/components/common/BaseImage.vue';
import RpgTag from '~/components/ui/RpgTag.vue';

const props = defineProps<{
    material: Material;
    team?: string;
    isNew?: boolean;
    thumbIndex?: number;
}>();

const emit = defineEmits<{
    open: [material: Material];
}>();

const fallbackSrc = computed(() => `/pixel/thumb-${((props.thumbIndex ?? props.material.id) % 4) + 1}-610.jpg`);
const dateLabel = computed(() => formatDate(props.material.publishedAt ?? props.material.date));
</script>

<template>
    <article
        class="group flex cursor-pointer flex-col overflow-hidden border-2 border-line bg-panel shadow-card transition-[border-color,box-shadow] hover:border-gold hover:shadow-card-hover focus-within:border-gold"
        :aria-label="material.titleZh"
        @click="emit('open', material)"
    >
        <div class="thumb relative aspect-video overflow-hidden border-b-2 border-line-2 bg-panel-2">
            <BaseImage
                :src="material.imageUrl"
                :fallback-src="fallbackSrc"
                :alt="material.titleZh"
                pixel
                class="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
            />
            <div class="absolute left-2.5 top-2.5 flex gap-1.5">
                <RpgTag v-if="team" :team="team">{{ team }}</RpgTag>
                <RpgTag v-if="isNew" color="gold" data-testid="new-badge">NEW</RpgTag>
            </div>
            <RpgTag v-if="material.sourceName" color="source" class="absolute right-2.5 top-2.5">
                {{ material.sourceName }}
            </RpgTag>
            <div
                class="absolute bottom-3 left-2.5 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
                <span class="tag-action bg-gold text-on-gold">▶ 快速預覽</span>
                <!-- TODO(討論): 收藏功能未定義（需登入？localStorage？） -->
                <span class="tag-action bg-head text-on-head">♡ 收藏</span>
            </div>
        </div>
        <div class="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-3">
            <button
                type="button"
                class="line-clamp-2 text-left text-[15px] font-bold leading-[22px] text-cream outline-none"
                @click.stop="emit('open', material)"
            >
                {{ material.titleZh }}
            </button>
            <div class="flex items-center justify-between text-xs text-muted">
                <span>{{ dateLabel }} · {{ material.sourceName ?? '—' }}</span>
                <span class="font-pixel text-sm">-- ▶</span>
            </div>
        </div>
    </article>
</template>

<style scoped>
.tag-action {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 700;
    line-height: 16px;
}
.thumb {
    background-image:
        linear-gradient(var(--c-glow) 1px, transparent 1px),
        linear-gradient(90deg, var(--c-glow) 1px, transparent 1px);
    background-size: 16px 16px;
}
</style>
