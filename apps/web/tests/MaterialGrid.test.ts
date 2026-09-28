import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialGrid from '../src/components/materials/MaterialGrid.vue';
import type { Material } from '../src/types/api';

const items: Material[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    playerId: 1,
    date: '2026-09-28',
    sourceUrl: `https://example.com/${i + 1}`,
    sourceName: 'ESPN',
    publishedAt: null,
    titleZh: `素材 ${i + 1}`,
    summaryZh: '摘要',
    keyQuotes: [],
    imageUrl: null,
    tags: [],
    score: null,
    status: 'published',
    createdAt: '2026-09-28T05:30:00.000Z'
}));

describe('MaterialGrid', () => {
    it('預設顯示 8 筆，載入更多後全部顯示', async () => {
        const wrapper = mount(MaterialGrid, {
            props: { items, teamOf: { 1: 'LAL' }, isNew: () => false }
        });
        expect(wrapper.findAll('article')).toHaveLength(8);
        expect(wrapper.find('[data-testid="shown-count"]').text()).toContain('8 / 12');

        await wrapper.find('[data-testid="load-more"]').trigger('click');
        expect(wrapper.findAll('article')).toHaveLength(12);
        expect(wrapper.find('[data-testid="load-more"]').exists()).toBe(false);
    });

    it('空清單顯示提示', () => {
        const wrapper = mount(MaterialGrid, {
            props: { items: [], teamOf: {}, isNew: () => false }
        });
        expect(wrapper.text()).toContain('目前沒有符合條件的素材');
    });

    it('卡片 open 事件往上拋', async () => {
        const wrapper = mount(MaterialGrid, {
            props: { items: items.slice(0, 2), teamOf: {}, isNew: () => false }
        });
        await wrapper.find('article button').trigger('click');
        expect(wrapper.emitted('open')?.[0]?.[0]).toMatchObject({ id: 1 });
    });
});
