<!--
  @file Accordion.vue
  @description 手風琴元件（自 fbcom 移植、改 RPG 風），支援單列文字、列表與 HTML 內容，平滑展開收合。
  @param title - 標題文字
  @param list - 內容列表
  @param listStyle - 列表樣式 (decimal | disc)
  @param content - HTML 內容（經 sanitizeHtml）
  @example <Accordion title="注意事項" :list="['item1', 'item2']" />
-->
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { sanitizeHtml } from '~/utils/sanitizeHtml';
import Icon from '~/components/icons/Icon.vue';

const props = withDefaults(
    defineProps<{
        title?: string;
        list?: string[];
        /** 列表樣式：decimal = 數字；disc = 圓點 */
        listStyle?: 'decimal' | 'disc';
        content?: string;
        defaultExpanded?: boolean;
        /**
         * 受控模式開關：需顯式設 `controlled`（搭配 :expanded + @toggle）才由父層接管。
         * 不可用「expanded 是否為 undefined」判斷——Boolean prop 未傳會被 Vue 轉成 false 而非 undefined，
         * 會讓所有未受控的 Accordion 誤判成受控而失效。
         */
        controlled?: boolean;
        /** 受控模式下的展開狀態（需搭配 controlled） */
        expanded?: boolean;
    }>(),
    {
        title: '',
        list: () => [],
        listStyle: 'disc',
        content: '',
        defaultExpanded: true
    }
);

const emit = defineEmits<{
    toggle: [];
    'update:expanded': [value: boolean];
}>();

// 受控模式：父層顯式 controlled 時以 props.expanded 為準；否則用內部 state 自管。
const internalExpanded = ref(props.defaultExpanded);
const isControlled = computed(() => props.controlled === true);
const isExpanded = computed(() =>
    isControlled.value ? !!props.expanded : internalExpanded.value
);

function toggle() {
    if (isControlled.value) {
        emit('toggle');
        emit('update:expanded', !props.expanded);
        return;
    }
    internalExpanded.value = !internalExpanded.value;
}

// 展開收合動畫：高度為連續動態值，runtime 直接設 el.style（不進 SSR payload）
const onEnter = (el: Element) => {
    const element = el as HTMLElement;
    element.style.height = '0px';
    element.style.opacity = '0';
    element.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        element.style.transition = 'height 260ms ease-out, opacity 180ms ease-out';
        element.style.height = `${element.scrollHeight}px`;
        element.style.opacity = '1';
    });
};

const onAfterEnter = (el: Element) => {
    const element = el as HTMLElement;
    element.style.height = '';
    element.style.opacity = '';
    element.style.overflow = '';
    element.style.transition = '';
};

const onLeave = (el: Element) => {
    const element = el as HTMLElement;
    element.style.height = `${element.scrollHeight}px`;
    element.style.opacity = '1';
    element.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        element.style.transition = 'height 220ms ease-in, opacity 140ms ease-in';
        element.style.height = '0px';
        element.style.opacity = '0';
    });
};

const onAfterLeave = (el: Element) => {
    const element = el as HTMLElement;
    element.style.height = '';
    element.style.opacity = '';
    element.style.overflow = '';
    element.style.transition = '';
};
</script>

<template>
    <div class="w-full border-2 border-line bg-panel">
        <div
            class="flex items-center border-b px-4 py-3 text-cream"
            :class="isExpanded ? 'border-line-2' : 'border-transparent'"
        >
            <slot name="title">
                <p class="flex-1 text-left text-base font-bold">{{ title }}</p>
            </slot>
            <button
                type="button"
                class="accordion-trigger flex items-center justify-center text-muted hover:text-gold"
                :aria-expanded="isExpanded"
                :aria-label="title || '展開'"
                @click="toggle"
            >
                <Icon
                    name="chevron-up"
                    :size="20"
                    class="accordion-chevron transition-transform duration-200"
                />
            </button>
        </div>
        <transition
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @leave="onLeave"
            @after-leave="onAfterLeave"
        >
            <div v-if="isExpanded" class="accordion-panel text-left text-sm text-cream">
                <p v-if="list && list.length === 1" class="p-4">{{ list[0] }}</p>
                <ul
                    v-else-if="list && list.length > 1"
                    class="list-inside space-y-1 p-4"
                    :class="listStyle === 'disc' ? 'list-disc' : 'list-decimal'"
                >
                    <li v-for="(item, index) in list" :key="index">{{ item }}</li>
                </ul>
                <!-- eslint-disable-next-line vue/no-v-html -- 一律先過 sanitizeHtml -->
                <div v-if="content" class="p-4" v-html="sanitizeHtml(content)"></div>
                <slot name="combo" />
            </div>
        </transition>
    </div>
</template>

<style scoped>
.accordion-panel {
    will-change: height;
}
.accordion-trigger .accordion-chevron {
    transform: rotate(180deg);
}
.accordion-trigger[aria-expanded='true'] .accordion-chevron {
    transform: rotate(0deg);
}
</style>
