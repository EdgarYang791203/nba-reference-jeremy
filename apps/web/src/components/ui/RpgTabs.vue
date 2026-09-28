<!--
  @file RpgTabs.vue
  @description 頁籤（DS Tab）：方框；選中 = gold 底 + ▶ + on-gold 字 + 琥珀外光；未選 = panel-2 + muted 字；計數 label-sm（Press Start 2P 9px）。
  素材頁球員頁籤（4.8）以此為基底，new badge 由呼叫端以 badge slot 帶入。
  @param tabs - { key, label, count? }[]
  @param modelValue - 選中的 key（v-model）
-->
<script setup lang="ts">
export interface RpgTabItem {
    key: string;
    label: string;
    count?: number;
}

defineProps<{
    tabs: RpgTabItem[];
    modelValue: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [key: string];
}>();
</script>

<template>
    <div class="flex flex-wrap gap-2" role="tablist">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="tab.key === modelValue"
            class="inline-flex items-center gap-2 border-2 px-4 py-2 text-sm font-bold leading-none transition-colors"
            :class="
                tab.key === modelValue
                    ? 'border-gold bg-gold text-on-gold shadow-tab'
                    : 'border-line bg-panel-2 text-muted hover:text-cream'
            "
            @click="emit('update:modelValue', tab.key)"
        >
            <span v-if="tab.key === modelValue" class="font-press text-[8px]" aria-hidden="true">▶</span>
            <span>{{ tab.label }}</span>
            <span v-if="tab.count !== undefined" class="font-press text-[9px]" data-testid="tab-count">
                {{ tab.count }}
            </span>
            <slot name="badge" :tab="tab" />
        </button>
    </div>
</template>
