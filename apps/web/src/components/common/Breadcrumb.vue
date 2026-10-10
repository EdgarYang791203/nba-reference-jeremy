<!--
  @file Breadcrumb.vue
  @description 麵包屑（fbcom 版重寫：本站為固定路由，不需導覽樹驗證，直接吃 items）。
  @param items - { label, to? }[]；最後一項為當頁（純文字），其餘有 to 才渲染連結
  @param showHome - 是否在最前面加「首頁」（預設 true）
  @example <Breadcrumb :items="[{ label: '素材庫', to: '/materials' }, { label: 'Stephen Curry' }]" />
-->
<script lang="ts" setup>
import { computed } from 'vue';
import AppLink from '~/components/common/AppLink.vue';

export interface BreadcrumbItem {
    label: string;
    to?: string;
}

const props = defineProps<{
    items: BreadcrumbItem[];
    showHome?: boolean;
}>();

const trail = computed<BreadcrumbItem[]>(() => {
    const home: BreadcrumbItem[] = props.showHome === false ? [] : [{ label: '首頁', to: '/' }];
    return [...home, ...props.items];
});
</script>

<template>
    <nav aria-label="麵包屑">
        <ol class="flex flex-wrap items-center gap-2 text-sm">
            <li v-for="(item, index) in trail" :key="index" class="flex items-center gap-2">
                <span v-if="index > 0" class="text-line-2" aria-hidden="true">/</span>
                <span v-if="index === trail.length - 1" class="text-cream" aria-current="page">
                    {{ item.label }}
                </span>
                <AppLink v-else :href="item.to" class="text-muted hover:text-gold">
                    {{ item.label }}
                </AppLink>
            </li>
        </ol>
    </nav>
</template>
