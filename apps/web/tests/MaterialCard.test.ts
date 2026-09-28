import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialCard from '../src/components/materials/MaterialCard.vue';
import type { Material } from '../src/types/api';

const material: Material = {
    id: 1,
    playerId: 1,
    date: '2026-09-28',
    sourceUrl: 'https://example.com/a',
    sourceName: 'ESPN',
    publishedAt: '2026-09-28T08:00:00.000Z',
    titleZh: 'LeBron 談第 24 季',
    summaryZh: '摘要',
    keyQuotes: [],
    imageUrl: null,
    tags: ['lakers'],
    score: 8,
    status: 'published',
    createdAt: '2026-09-28T05:30:00.000Z'
};

describe('MaterialCard', () => {
    it('顯示標題、來源與隊色 tag', () => {
        const wrapper = mount(MaterialCard, { props: { material, team: 'LAL' } });
        expect(wrapper.text()).toContain('LeBron 談第 24 季');
        expect(wrapper.text()).toContain('ESPN');
        expect(wrapper.find('.bg-team-lal').exists()).toBe(true);
    });

    it('isNew 時顯示 NEW 標籤', () => {
        const withNew = mount(MaterialCard, { props: { material, isNew: true } });
        expect(withNew.find('[data-testid="new-badge"]').exists()).toBe(true);

        const withoutNew = mount(MaterialCard, { props: { material, isNew: false } });
        expect(withoutNew.find('[data-testid="new-badge"]').exists()).toBe(false);
    });

    it('點擊 emit open 且只 emit 一次', async () => {
        const wrapper = mount(MaterialCard, { props: { material } });
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('open')).toHaveLength(1);
        expect(wrapper.emitted('open')?.[0]).toEqual([material]);
    });

    it('imageUrl 為空時走像素 fallback 底圖', () => {
        const wrapper = mount(MaterialCard, { props: { material, thumbIndex: 2 } });
        const img = wrapper.find('img');
        expect(img.exists()).toBe(true);
        expect(img.attributes('src')).toBe('/pixel/thumb-3-610.jpg');
        expect(img.classes()).toContain('pixel-asset');
    });
});
