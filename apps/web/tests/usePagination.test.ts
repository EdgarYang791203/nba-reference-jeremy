import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { usePagination } from '../src/composables/usePagination';

describe('usePagination', () => {
    it('初始顯示 pageSize 筆，showMore 遞增', () => {
        const data = ref(Array.from({ length: 15 }, (_, i) => i));
        const { visibleItems, hasMore, showMore } = usePagination(
            computed(() => data.value),
            6
        );

        expect(visibleItems.value).toHaveLength(6);
        expect(hasMore.value).toBe(true);

        showMore();
        expect(visibleItems.value).toHaveLength(12);

        showMore();
        expect(visibleItems.value).toHaveLength(15);
        expect(hasMore.value).toBe(false);
    });

    it('資料來源變更時重置顯示數', async () => {
        const data = ref(Array.from({ length: 20 }, (_, i) => i));
        const { visibleItems, showMore } = usePagination(
            computed(() => data.value),
            5
        );

        showMore();
        expect(visibleItems.value).toHaveLength(10);

        data.value = Array.from({ length: 8 }, (_, i) => i);
        await nextTick();
        expect(visibleItems.value).toHaveLength(5);
    });
});
