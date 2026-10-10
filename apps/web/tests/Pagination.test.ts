import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Pagination from '../src/components/common/Pagination.vue';

describe('Pagination', () => {
    it('只有一頁時不渲染', () => {
        const wrapper = mount(Pagination, {
            props: { modelValue: 1, totalItems: 5, pageSize: 10 }
        });
        expect(wrapper.find('button').exists()).toBe(false);
    });

    it('點頁碼 emit update:modelValue（不捲動）', async () => {
        const wrapper = mount(Pagination, {
            props: { modelValue: 1, totalItems: 50, pageSize: 10, scrollToTop: false }
        });
        await wrapper.find('button[aria-label="前往第 2 頁"]').trigger('click');
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2]);
    });

    it('第一頁時上一頁停用', () => {
        const wrapper = mount(Pagination, {
            props: { modelValue: 1, totalItems: 50, pageSize: 10 }
        });
        expect(wrapper.find('button[aria-label="上一頁"]').attributes('disabled')).toBeDefined();
    });

    it('頁數多時顯示省略號視窗', () => {
        const wrapper = mount(Pagination, {
            props: { modelValue: 10, totalItems: 200, pageSize: 10 }
        });
        // wide window: 1 ... 9 10 11 ... 20
        expect(wrapper.text()).toContain('1');
        expect(wrapper.text()).toContain('20');
        expect(wrapper.find('button[aria-label="前往第 9 頁"]').exists()).toBe(true);
    });
});
