<!--
  @file RpgTag.vue
  @description 標籤（DS Tag）：無圓角、無邊框、實色底，padding 8×3，tag 12 bold。
  @param color - blue（角色，如 30+ 名單）| brown（職業，如 可寫人物稿）| source（來源：bg 底 cream 字）| gold（NEW / 強調）| head（hover 動作次要）
  @param team - 球隊縮寫（lal/gsw…），設定時以 bg-team-<abbr> + text-team-<abbr>-text 上隊色（tailwind safelist 保住）
-->
<script setup lang="ts">
import { computed } from 'vue';
import { TEAM_TEXT_COLORS } from '~/constants/teamColors';

const props = defineProps<{
    color?: 'blue' | 'brown' | 'source' | 'gold' | 'head';
    team?: string;
}>();

const colorClass = computed(() => {
    if (props.team) {
        const abbr = props.team.toLowerCase();
        const textClass = TEAM_TEXT_COLORS[abbr] ? `text-team-${abbr}-text` : 'text-white';
        return `bg-team-${abbr} ${textClass}`;
    }
    switch (props.color ?? 'blue') {
        case 'brown':
            return 'bg-tag-brown text-on-tag-brown';
        case 'source':
            return 'bg-bg text-cream';
        case 'gold':
            return 'bg-gold text-on-gold';
        case 'head':
            return 'bg-head text-on-head';
        default:
            return 'bg-tag-blue text-on-tag-blue';
    }
});
</script>

<template>
    <span
        class="inline-flex items-center px-2 py-[3px] text-xs font-bold leading-4"
        :class="colorClass"
    >
        <slot />
    </span>
</template>
