<!--
  @file MaterialGrid.vue
  @description 素材卡片格（4 欄）+「▼ 載入更多素材 --limit 8」+ 已顯示 n / N 篇。前端漸進式顯示（usePagination）。
  @param items - 已依頁籤／來源篩好的素材
  @param teamOf - playerId → 球隊縮寫
  @param isNew - (material) => boolean
  @param pageSize - 每次載入筆數（預設 8）
-->
<script setup lang="ts">
import { computed, toRef } from 'vue';
import type { Material } from '~/types/api';
import { usePagination } from '~/composables/usePagination';
import MaterialCard from './MaterialCard.vue';

const props = withDefaults(
    defineProps<{
        items: Material[];
        teamOf: Record<number, string>;
        isNew: (material: Material) => boolean;
        pageSize?: number;
    }>(),
    { pageSize: 8 }
);

const emit = defineEmits<{
    open: [material: Material];
}>();

const source = computed(() => toRef(props, 'items').value);
const { visibleItems, hasMore, showMore } = usePagination(source, props.pageSize);
</script>

<template>
    <div>
        <div
            v-if="visibleItems.length"
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
            data-testid="material-grid"
        >
            <MaterialCard
                v-for="(material, index) in visibleItems"
                :key="material.id"
                :material="material"
                :team="teamOf[material.playerId]"
                :is-new="isNew(material)"
                :thumb-index="index"
                @open="emit('open', $event)"
            />
        </div>
        <p v-else class="border-2 border-line bg-panel-2 px-4 py-10 text-center text-sm text-muted">
            目前沒有符合條件的素材。
        </p>

        <div class="flex flex-col items-center gap-3 py-7">
            <button
                v-if="hasMore"
                type="button"
                class="flex items-center gap-2.5 border-2 border-gold bg-panel-2 px-6 py-3 font-mono text-gold hover:bg-head"
                data-testid="load-more"
                @click="showMore"
            >
                <span class="font-press text-[10px]" aria-hidden="true">▼</span>
                <span class="font-pixel text-xl">載入更多素材</span>
                <span class="text-xs text-muted">--limit {{ pageSize }}</span>
            </button>
            <span class="text-xs text-muted" data-testid="shown-count">
                已顯示 {{ visibleItems.length }} / {{ items.length }} 篇
            </span>
        </div>
    </div>
</template>
