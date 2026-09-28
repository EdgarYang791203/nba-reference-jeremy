import { sanitizeHtml } from './sanitizeHtml';

/** 將文字中的數字段包上 <span class="highlight">，供強調數據用（自 fbcom 移植）。 */
export function formatTextToHtml(text: string): string {
    if (!text) {
        return '';
    }

    let result = '';
    let index = 0;

    while (index < text.length) {
        const ch = text.charAt(index);

        // 遇到數字，開始收集「數字段」
        if (/[0-9]/.test(ch)) {
            let token = ch;
            index++;

            while (index < text.length) {
                const c = text.charAt(index);
                const next = text.charAt(index + 1);

                if (/[0-9]/.test(c)) {
                    token += c;
                    index++;
                    continue;
                }

                if (c === '.' || c === ',' || c === '，') {
                    // 只有在「後面還有數字」時才視為數字的一部分
                    if (next && /[0-9]/.test(next)) {
                        token += c;
                        index++;
                        continue;
                    } else {
                        break;
                    }
                }

                if (c === '%') {
                    token += c;
                    index++;
                    continue;
                }

                break;
            }

            result += `<span class="highlight">${token}</span>`;
            continue;
        }

        result += ch;
        index++;
    }

    return sanitizeHtml(result);
}
