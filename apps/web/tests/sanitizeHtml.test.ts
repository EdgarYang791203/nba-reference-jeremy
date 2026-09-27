import { describe, expect, it } from 'vitest';
import { sanitizeHtml, stripHtml } from '../src/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
    it('移除 script / iframe / style 區塊', () => {
        expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
        expect(sanitizeHtml('<iframe src="x"></iframe><b>hi</b>')).toBe('<b>hi</b>');
    });

    it('移除 inline 事件與 style，保留 class', () => {
        expect(sanitizeHtml('<p class="a" onclick="x()" style="color:red">t</p>')).toBe(
            '<p class="a">t</p>'
        );
    });

    it('不誤殺 data-style 之類屬性', () => {
        expect(sanitizeHtml('<p data-style="x">t</p>')).toBe('<p data-style="x">t</p>');
    });

    it('移除 javascript: pseudo-protocol', () => {
        expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a href="alert(1)">x</a>');
    });

    it('null / 空字串回空', () => {
        expect(sanitizeHtml(null)).toBe('');
        expect(sanitizeHtml('')).toBe('');
    });
});

describe('stripHtml', () => {
    it('剝標籤、還原 entity、正規化空白', () => {
        expect(stripHtml('<p>a&nbsp;&amp;  b</p>')).toBe('a & b');
    });
});
