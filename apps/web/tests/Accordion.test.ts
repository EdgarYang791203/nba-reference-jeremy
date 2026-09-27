import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Accordion from '../src/components/common/Accordion.vue';

describe('Accordion', () => {
    it('預設展開，點擊收合', async () => {
        const wrapper = mount(Accordion, {
            props: { title: '注意事項', list: ['a', 'b'] }
        });
        expect(wrapper.find('.accordion-panel').exists()).toBe(true);

        await wrapper.find('button').trigger('click');
        expect(wrapper.find('button').attributes('aria-expanded')).toBe('false');
    });

    it('受控模式只 emit，不自行切換', async () => {
        const wrapper = mount(Accordion, {
            props: { title: 't', list: ['a'], controlled: true, expanded: false }
        });
        expect(wrapper.find('.accordion-panel').exists()).toBe(false);

        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('toggle')).toHaveLength(1);
        expect(wrapper.emitted('update:expanded')?.[0]).toEqual([true]);
        // props 未變，仍收合
        expect(wrapper.find('.accordion-panel').exists()).toBe(false);
    });

    it('content 經 sanitizeHtml（script 不落 DOM）', () => {
        const wrapper = mount(Accordion, {
            props: { title: 't', content: '<b>ok</b><script>alert(1)</script>' }
        });
        expect(wrapper.html()).toContain('<b>ok</b>');
        expect(wrapper.html()).not.toContain('<script>');
    });
});
