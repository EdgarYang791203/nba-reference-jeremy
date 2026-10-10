<!--
  @file AppLink.vue
  @description 通用連結元件（自 fbcom 移植）。依 href 是否含 protocol 自動判斷外部連結（<a> + target="_blank"
  + rel="noopener noreferrer"）或站內連結（<NuxtLink>）。href 為空或 disabled 時渲染 <span>。
  @param href - 目標連結；含 protocol（http/mailto 等）視為外部，否則視為站內路徑
  @param target - 覆寫 target（未傳時：外部預設 _blank、站內無 target）
  @param rel - 覆寫外部連結的 rel（預設 noopener noreferrer）
  @param icon - Icon name；傳入時顯示於文字右側
  @param iconSize - Icon 尺寸（預設 20）
  @param iconClass - Icon 顏色 class（如 text-gold），未傳則繼承文字顏色
  @param disabled - 停用連結
-->
<script setup lang="ts">
import { computed } from 'vue';
import { hasProtocol } from '~/utils/linkHelpers';
import Icon from '~/components/icons/Icon.vue';

// 多個條件根節點時必須關閉自動 attrs 繼承，
// 改為在每個根節點手動 v-bind="$attrs"，否則 SSR hydration 會 mismatch
defineOptions({ inheritAttrs: false });

const props = defineProps<{
    href?: string | null;
    target?: string;
    rel?: string;
    icon?: string;
    iconSize?: number;
    iconClass?: string;
    disabled?: boolean;
}>();

/** href 有效才嘗試渲染連結；undefined / 空字串視同 disabled */
const normalizedHref = computed(() => (props.href ?? '').trim());
const isEmpty = computed(() => !normalizedHref.value);

const isExternal = computed(() => hasProtocol(normalizedHref.value));

const resolvedTarget = computed(() => {
    if (props.target !== undefined) {
        return props.target;
    }
    return isExternal.value ? '_blank' : undefined;
});

/** 只有真的開新分頁（_blank）才需要 rel */
const resolvedRel = computed(() =>
    resolvedTarget.value === '_blank' ? (props.rel ?? 'noopener noreferrer') : undefined
);

const resolvedIconSize = computed(() => props.iconSize ?? 20);

const isDisabled = computed(() => props.disabled || isEmpty.value);
</script>

<template>
    <!-- 停用狀態：用 <span>（非互動文字），避免污染 screen reader 的標題大綱 -->
    <span
        v-if="isDisabled"
        class="inline-flex cursor-not-allowed select-none items-center gap-1 opacity-50"
        aria-disabled="true"
        v-bind="$attrs"
    >
        <slot />
        <!-- shrink-0：flex 內文字過長時不可壓縮 icon（文字自行折行） -->
        <Icon v-if="icon" :name="icon" :size="resolvedIconSize" class="shrink-0" :class="iconClass" />
    </span>

    <!-- 外部連結 -->
    <a
        v-else-if="isExternal"
        :href="normalizedHref"
        :target="resolvedTarget"
        :rel="resolvedRel"
        class="inline-flex items-center gap-1"
        v-bind="$attrs"
    >
        <slot />
        <Icon v-if="icon" :name="icon" :size="resolvedIconSize" class="shrink-0" :class="iconClass" />
    </a>

    <!-- 站內路徑 -->
    <NuxtLink
        v-else
        :to="normalizedHref"
        :target="resolvedTarget"
        :rel="resolvedRel"
        class="inline-flex items-center gap-1"
        v-bind="$attrs"
    >
        <slot />
        <Icon v-if="icon" :name="icon" :size="resolvedIconSize" class="shrink-0" :class="iconClass" />
    </NuxtLink>
</template>
