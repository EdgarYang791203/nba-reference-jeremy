import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RpgTabs from '../src/components/ui/RpgTabs.vue';

const tabs = [
    { key: 'a', label: 'Player A', count: 2 },
    { key: 'b', label: 'Player B' }
];

describe('RpgTabs', () => {
    it('選中頁籤顯示 ▶ 與 aria-selected', () => {
        const wrapper = mount(RpgTabs, { props: { tabs, modelValue: 'a' } });
        const buttons = wrapper.findAll('button');
        expect(buttons[0].attributes('aria-selected')).toBe('true');
        expect(buttons[0].text()).toContain('▶');
        expect(buttons[1].attributes('aria-selected')).toBe('false');
    });

    it('點擊未選頁籤 emit update:modelValue', async () => {
        const wrapper = mount(RpgTabs, { props: { tabs, modelValue: 'a' } });
        await wrapper.findAll('button')[1].trigger('click');
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b']);
    });

    it('count 以 Press Start 2P 顯示', () => {
        const wrapper = mount(RpgTabs, { props: { tabs, modelValue: 'a' } });
        expect(wrapper.find('.font-press').text()).toBe('2');
    });
});
