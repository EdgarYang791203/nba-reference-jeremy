<!--
  @file SourceChips.vue
  @description 來源篩選 chip 列（設計稿 TABS 右側）：mono 小字方框，選中 = head 底 + gold 字與邊。
  @param sources - 來源名稱清單
  @param modelValue - 選中的來源（'' = 全部）
-->
<script setup lang="ts">
defineProps<{
    sources: string[];
    modelValue: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();
</script>

<template>
    <div class="flex flex-wrap gap-2" role="group" aria-label="來源篩選">
        <button
            type="button"
            class="chip"
            :class="{ on: modelValue === '' }"
            :aria-pressed="modelValue === ''"
            @click="emit('update:modelValue', '')"
        >
            全部
        </button>
        <button
            v-for="source in sources"
            :key="source"
            type="button"
            class="chip"
            :class="{ on: modelValue === source }"
            :aria-pressed="modelValue === source"
            @click="emit('update:modelValue', source)"
        >
            {{ source }}
        </button>
        <!-- TODO(討論): 排序選項（最新 / 熱門） -->
        <span class="chip cursor-default opacity-70">最新 ▾</span>
    </div>
</template>

<style scoped>
.chip {
    display: inline-flex;
    padding: 5px 10px;
    border: 1px solid var(--c-border);
    background: var(--c-panel-2);
    color: var(--c-muted);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
}
.chip.on {
    background: var(--c-head);
    color: var(--c-gold);
    border-color: var(--c-gold);
}
button.chip:hover {
    color: var(--c-cream);
}
</style>
