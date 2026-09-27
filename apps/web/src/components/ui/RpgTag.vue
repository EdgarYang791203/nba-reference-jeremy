<!--
  @file RpgTag.vue
  @description 標籤（9D.4 Tag）：無圓角、無邊框、實色底，padding 8×3，Bold 12。
  @param color - blue（角色）| brown（職業）| source（來源：bg 底 cream 字）| gold（NEW / 強調）
  @param team - 球隊縮寫（lal/gsw…），設定時以 bg-team-<abbr> 上隊色（tailwind safelist 保住）
-->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    color?: 'blue' | 'brown' | 'source' | 'gold';
    team?: string;
}>();

const colorClass = computed(() => {
    if (props.team) {
        return `bg-team-${props.team.toLowerCase()} text-cream`;
    }
    switch (props.color ?? 'blue') {
        case 'brown':
            return 'bg-tag-brown text-cream';
        case 'source':
            return 'bg-bg text-cream';
        case 'gold':
            return 'bg-gold text-bg';
        default:
            return 'bg-tag-blue text-bg';
    }
});
</script>

<template>
    <span class="inline-block px-2 py-[3px] text-xs font-bold leading-none" :class="colorClass">
        <slot />
    </span>
</template>
