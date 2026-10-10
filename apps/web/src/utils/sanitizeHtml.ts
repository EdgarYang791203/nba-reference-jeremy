/**
 * 給 v-html 前使用的輕量 HTML 正規化／風險字串剔除（自 fbcom-frontend-web 移植）。
 * 無法如 DOMPurify 般完整防 XSS，僅適合信任來源（本站素材皆經後端 zod 驗證）且需減少明顯注入的情境。
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (html == null || html === '') {
        return '';
    }

    let s = String(html);

    // 含內容的危險標籤
    s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
    s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '');
    s = s.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '');

    // 單標籤／可於外部內容誤帶入的互動或載入類標籤
    s = s.replace(
        /<\/?(?:object|embed|form|input|button|textarea|select|option|frame|frameset|meta|link|base)\b[^>]*>/gi,
        ''
    );

    // inline 事件（onerror、onclick…）
    s = s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // inline style 屬性（本專案慣例：DOM 不留 style="..."）
    // 注意：只洗 style 自身，不動 class 與其他常規屬性。leading \s+ 確保不誤殺 data-style 之類。
    s = s.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 常見 script pseudo-protocol
    s = s.replace(/javascript:/gi, '');
    s = s.replace(/vbscript:/gi, '');

    return s;
}

/**
 * 剝除所有 HTML 標籤並還原常見 entity，輸出純文字。
 * 適用於需要計算視覺字數截斷、或用於文字搜尋過濾的場景。
 */
export function stripHtml(html: string | null | undefined): string {
    if (html == null || html === '') {
        return '';
    }
    return String(html)
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
