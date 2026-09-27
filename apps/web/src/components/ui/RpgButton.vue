<!--
  @file RpgButton.vue
  @description 按鈕（9D.4 Button）。主要 = gold 底 bg 字；次要 = panel-2 + 2px 金邊 + ▼ + 像素字；danger 供破壞性 action。
  @param variant - primary（預設）| secondary | danger
  @param type - button type，預設 'button'
  @param disabled
  @param loading - 顯示閃爍 _ 並停用
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    variant?: 'primary' | 'secondary' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

const variantClass = computed(() => {
    switch (props.variant ?? 'primary') {
        case 'secondary':
            return 'bg-panel-2 border-2 border-line text-gold font-pixel hover:bg-head';
        case 'danger':
            return 'bg-hp text-cream font-bold hover:brightness-110';
        default:
            return 'bg-gold text-bg font-bold hover:brightness-110';
    }
});

const isDisabled = computed(() => props.disabled || props.loading);

function onClick(event: MouseEvent) {
    if (isDisabled.value) {
        return;
    }
    emit('click', event);
}
</script>

<template>
    <button
        :type="type ?? 'button'"
        class="inline-flex items-center gap-2 px-4 py-2 text-[13px] leading-none transition-[filter] disabled:cursor-not-allowed disabled:opacity-50"
        :class="variantClass"
        :disabled="isDisabled"
        @click="onClick"
    >
        <span v-if="(variant ?? 'primary') === 'secondary'" aria-hidden="true">▼</span>
        <slot />
        <span v-if="loading" class="rpg-blink" aria-hidden="true">_</span>
    </button>
</template>
