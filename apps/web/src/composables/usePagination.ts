import { computed, ref, watch } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * 漸進式分頁顯示（自 fbcom 移植）。
 * @param source  完整資料陣列的 computed ref
 * @param pageSize 每次顯示/增加的筆數（預設 6）
 */
export function usePagination<T>(source: ComputedRef<T[]>, pageSize: number = 6) {
    const displayCount = ref(pageSize);

    watch(source, () => {
        displayCount.value = pageSize;
    });

    const visibleItems = computed(() => source.value.slice(0, displayCount.value));
    const hasMore = computed(() => displayCount.value < source.value.length);

    function showMore() {
        displayCount.value = Math.min(displayCount.value + pageSize, source.value.length);
    }

    return { visibleItems, hasMore, showMore };
}
