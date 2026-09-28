/**
 * 錯誤 → 使用者訊息 → 全域 dialog（自 fbcom `responseHint.ts` 移植精簡）。
 * 訊息優先序：後端 error.message（非通用碼）→ HTTP status 對照表 → 逾時 / 斷線判斷。
 */
import type { ApiError } from './http';
import type { DialogConfig } from '~/stores/global';

const HTTP_STATUS_MESSAGES: Record<number, string> = {
    400: '請確認資料再試一次',
    401: '登入逾時，請重新登入',
    403: '請先登入取得權限',
    404: '找不到資源，請稍後再試',
    408: '連線逾時，請稍後再試',
    429: '操作太頻繁，請稍後再試',
    500: '系統忙碌中，請稍後再試',
    502: '系統忙碌中，請稍後再試',
    503: '我們正在提供更好的服務，請稍後再試',
    504: '連線逾時，請稍後再試'
};

const GENERIC_CODES = new Set(['UNKNOWN', 'HTTP_ERROR', 'BAD_ENVELOPE', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST', 'ERR_NETWORK']);

export function resolveErrorMessage(error: ApiError): string {
    if (error.isTimeout) {
        return '連線逾時，請稍後再試';
    }
    if (error.isNetworkError) {
        const online = typeof navigator === 'undefined' ? true : navigator.onLine;
        return online ? '系統忙碌中，請稍後再試' : '請確認網路連線';
    }
    if (error.status !== null && HTTP_STATUS_MESSAGES[error.status]) {
        // 後端有明確 code 與訊息時優先顯示（zod 驗證錯誤等）
        if (!GENERIC_CODES.has(error.code) && error.message) {
            return error.message;
        }
        return HTTP_STATUS_MESSAGES[error.status];
    }
    return error.message || '系統忙碌中，請稍後再試';
}

export function buildErrorDialog(error: ApiError, callback?: () => void): DialogConfig {
    return {
        title: '系統訊息',
        content: resolveErrorMessage(error),
        status: 'error',
        primary: { title: '確認', action: callback }
    };
}
