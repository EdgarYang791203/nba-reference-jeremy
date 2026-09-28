<!--
  @file Pagination.vue
  @description 分頁共用元件（自 fbcom 移植、預設樣式改 RPG 風），支援頁碼列與「目前頁 / 總頁數」兩種版型。
  @param {Number} modelValue 當前頁碼 (v-model)
  @param {Number} totalItems 總資料筆數
  @param {Number} pageSize 每頁資料筆數
  @param {'list' | 'input'} mode 頁碼列或頁碼輸入版型
  @param {Boolean} scrollToTop 換頁後是否捲動至頁面頂端
  @emits {update:modelValue} 觸發換頁事件
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Icon from '~/components/icons/Icon.vue';

type PaginationMode = 'list' | 'input';
type PageWindow = 'wide' | 'compact';
type PaginationClasses = Partial<{
    root: string;
    controls: string;
    button: string;
    buttonDisabled: string;
    buttonEnabled: string;
    pageList: string;
    ellipsis: string;
    pageButton: string;
    pageActive: string;
    pageInactive: string;
    inputWrapper: string;
    input: string;
    separator: string;
    pageTotal: string;
    summary: string;
}>;

const props = withDefaults(
    defineProps<{
        modelValue: number;
        totalItems: number;
        pageSize: number;
        mode?: PaginationMode;
        pageWindow?: PageWindow;
        showWhenSinglePage?: boolean;
        scrollToTop?: boolean;
        iconSize?: number;
        classes?: PaginationClasses;
    }>(),
    {
        mode: 'list',
        pageWindow: 'wide',
        showWhenSinglePage: false,
        scrollToTop: true,
        iconSize: 20,
        classes: undefined
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
}>();

const defaultClasses: Required<PaginationClasses> = {
    root: 'flex flex-col items-center gap-3 pt-6',
    controls: 'flex items-center gap-3',
    button: 'w-10 h-10 flex items-center justify-center border-2 border-line-2 bg-panel-2 text-cream transition-colors shrink-0',
    buttonDisabled: 'opacity-40 cursor-not-allowed',
    buttonEnabled: 'hover:border-gold hover:text-gold',
    pageList: 'flex items-center gap-1',
    ellipsis: 'h-10 min-w-10 flex items-center justify-center text-muted',
    pageButton:
        'h-10 min-w-10 px-2 flex items-center justify-center font-pixel text-lg transition-colors',
    pageActive: 'bg-gold text-bg',
    pageInactive: 'text-muted hover:bg-head hover:text-cream',
    inputWrapper: 'flex items-center gap-2 font-pixel text-lg text-cream',
    input: 'w-12 border-2 border-line-2 bg-track py-1 text-center text-cream outline-none focus:border-gold',
    separator: 'text-muted',
    pageTotal: 'text-muted',
    summary: 'text-xs text-muted'
};

const classNames = computed<Required<PaginationClasses>>(() => ({
    ...defaultClasses,
    ...(props.classes ?? {})
}));

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)));
const pageInput = ref(String(props.modelValue));

watch(
    [() => props.modelValue, totalPages],
    ([page]) => {
        pageInput.value = String(page);
    },
    { immediate: true }
);

function normalizePage(page: number): number {
    return Math.max(1, Math.min(Math.trunc(page), totalPages.value));
}

async function updatePage(page: number) {
    const nextPage = normalizePage(page);
    pageInput.value = String(nextPage);

    if (nextPage === props.modelValue) {
        return;
    }

    emit('update:modelValue', nextPage);

    if (props.scrollToTop && import.meta.client) {
        await nextTick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function submitPageInput() {
    const nextPage = Number.parseInt(pageInput.value, 10);
    if (Number.isNaN(nextPage)) {
        pageInput.value = String(props.modelValue);
        return;
    }
    void updatePage(nextPage);
}

function handlePageInput(event: Event) {
    const target = event.target as HTMLInputElement;
    pageInput.value = target.value.replace(/\D+/g, '');
}

function handlePageInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        event.preventDefault();
        (event.currentTarget as HTMLInputElement).blur();
    } else if (event.key === 'Escape') {
        pageInput.value = String(props.modelValue);
        (event.currentTarget as HTMLInputElement).blur();
    }
}

function getCompactVisiblePages(total: number, current: number): (number | '...')[] {
    const pageSet = new Set<number>([1, total, current]);
    if (current - 1 >= 1) {
        pageSet.add(current - 1);
    }
    if (current + 1 <= total) {
        pageSet.add(current + 1);
    }

    const sorted = [...pageSet].sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    let prev: number | undefined;
    for (const page of sorted) {
        if (prev !== undefined) {
            const gap = page - prev;
            if (gap === 2) {
                result.push(prev + 1);
            } else if (gap > 2) {
                result.push('...');
            }
        }
        result.push(page);
        prev = page;
    }
    return result;
}

function getWideVisiblePages(total: number, current: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

const visiblePages = computed(() =>
    props.pageWindow === 'compact'
        ? getCompactVisiblePages(totalPages.value, props.modelValue)
        : getWideVisiblePages(totalPages.value, props.modelValue)
);

const rangeStart = computed(() =>
    props.totalItems === 0 ? 0 : (props.modelValue - 1) * props.pageSize + 1
);
const rangeEnd = computed(() => Math.min(props.modelValue * props.pageSize, props.totalItems));
</script>

<template>
    <div v-if="showWhenSinglePage ? totalItems > 0 : totalPages > 1" :class="classNames.root">
        <div :class="classNames.controls">
            <button
                type="button"
                :class="[
                    classNames.button,
                    modelValue === 1 ? classNames.buttonDisabled : classNames.buttonEnabled
                ]"
                :disabled="modelValue === 1"
                aria-label="上一頁"
                @click="updatePage(modelValue - 1)"
            >
                <Icon name="chevron-left" :size="iconSize" />
            </button>

            <div v-if="mode === 'list'" :class="classNames.pageList">
                <template v-for="(page, index) in visiblePages" :key="`${page}-${index}`">
                    <div v-if="page === '...'" :class="classNames.ellipsis">
                        <Icon name="ellipsis" :size="iconSize" />
                    </div>
                    <label
                        v-else-if="page === modelValue"
                        :class="[classNames.pageButton, classNames.pageActive]"
                    >
                        <input
                            v-model="pageInput"
                            type="text"
                            inputmode="numeric"
                            class="w-full bg-transparent text-center outline-none"
                            pattern="[0-9]*"
                            role="spinbutton"
                            :size="String(totalPages).length"
                            :aria-label="`目前第 ${modelValue} 頁，共 ${totalPages} 頁，請輸入頁碼`"
                            :aria-valuemin="1"
                            :aria-valuemax="totalPages"
                            :aria-valuenow="modelValue"
                            @input="handlePageInput"
                            @keydown="handlePageInputKeydown"
                            @blur="submitPageInput"
                        />
                    </label>
                    <button
                        v-else
                        type="button"
                        :class="[classNames.pageButton, classNames.pageInactive]"
                        :aria-label="`前往第 ${page} 頁`"
                        @click="updatePage(page)"
                    >
                        {{ page }}
                    </button>
                </template>
            </div>

            <div v-else :class="classNames.inputWrapper">
                <input
                    v-model="pageInput"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    role="spinbutton"
                    :size="String(totalPages).length"
                    :class="classNames.input"
                    :aria-label="`目前第 ${modelValue} 頁，共 ${totalPages} 頁，請輸入頁碼`"
                    :aria-valuemin="1"
                    :aria-valuemax="totalPages"
                    :aria-valuenow="modelValue"
                    @input="handlePageInput"
                    @keydown="handlePageInputKeydown"
                    @blur="submitPageInput"
                />
                <span :class="classNames.separator">/</span>
                <span :class="classNames.pageTotal">{{ totalPages }}</span>
            </div>

            <button
                type="button"
                :class="[
                    classNames.button,
                    modelValue === totalPages ? classNames.buttonDisabled : classNames.buttonEnabled
                ]"
                :disabled="modelValue === totalPages"
                aria-label="下一頁"
                @click="updatePage(modelValue + 1)"
            >
                <Icon name="chevron-right" :size="iconSize" />
            </button>
        </div>

        <div :class="classNames.summary">
            <slot
                name="summary"
                :range-start="rangeStart"
                :range-end="rangeEnd"
                :total-items="totalItems"
            >
                <span>{{ rangeStart }}-{{ rangeEnd }}筆 (共 {{ totalItems }}筆)</span>
            </slot>
        </div>
    </div>
</template>
