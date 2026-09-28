import { describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { ApiError, createHttp } from '../src/apis/http';
import { resolveErrorMessage } from '../src/apis/responseHint';

function adapterFrom(
    responder: (config: InternalAxiosRequestConfig) => { status: number; data: unknown }
): AxiosAdapter {
    return async (config) => {
        const { status, data } = responder(config);
        const response = { data, status, statusText: 'OK', headers: {}, config };
        if (status >= 400) {
            const { AxiosError } = await import('axios');
            throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
        }
        return response;
    };
}

describe('createHttp', () => {
    it('解封 ok envelope 並回傳 data；loading hook 各呼叫一次', async () => {
        const onLoading = vi.fn();
        const http = createHttp({
            baseURL: '',
            useMock: false,
            adapter: adapterFrom(() => ({ status: 200, data: { ok: true, data: { id: 1 } } })),
            hooks: { onLoading }
        });

        const result = await http.get<{ id: number }>('/api/materials/1');
        expect(result).toEqual({ id: 1 });
        expect(onLoading.mock.calls).toEqual([[true], [false]]);
    });

    it('ok=false 一律 reject 成 ApiError 並觸發 onError', async () => {
        const onError = vi.fn();
        const http = createHttp({
            baseURL: '',
            useMock: false,
            adapter: adapterFrom(() => ({
                status: 200,
                data: { ok: false, error: { code: 'NOT_FOUND', message: '找不到素材' } }
            })),
            hooks: { onError }
        });

        await expect(http.get('/api/materials/999')).rejects.toBeInstanceOf(ApiError);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0]?.[0].code).toBe('NOT_FOUND');
    });

    it('HTTP 4xx 帶後端 envelope 時取其 code/message', async () => {
        const http = createHttp({
            baseURL: '',
            useMock: false,
            adapter: adapterFrom(() => ({
                status: 400,
                data: { ok: false, error: { code: 'VALIDATION', message: 'playerId 需為數字' } }
            })),
            hooks: {}
        });

        const error = (await http.get('/api/materials').catch((e) => e)) as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.code).toBe('VALIDATION');
        expect(resolveErrorMessage(error)).toBe('playerId 需為數字');
    });

    it('isErrorAlert=false 不呼叫 onError，但仍 reject', async () => {
        const onError = vi.fn();
        const http = createHttp({
            baseURL: '',
            useMock: false,
            adapter: adapterFrom(() => ({ status: 500, data: {} })),
            hooks: { onError }
        });

        await expect(http.get('/api/x', undefined, { isErrorAlert: false })).rejects.toBeInstanceOf(
            ApiError
        );
        expect(onError).not.toHaveBeenCalled();
    });

    it('withGlobalLoading=false 不動 loading', async () => {
        const onLoading = vi.fn();
        const http = createHttp({
            baseURL: '',
            useMock: false,
            adapter: adapterFrom(() => ({ status: 200, data: { ok: true, data: [] } })),
            hooks: { onLoading }
        });

        await http.get('/api/players', undefined, { withGlobalLoading: false });
        expect(onLoading).not.toHaveBeenCalled();
    });

    it('mock 模式命中查表時不發請求、不動 loading', async () => {
        const adapter = vi.fn();
        const onLoading = vi.fn();
        const http = createHttp({
            baseURL: '',
            useMock: true,
            adapter: adapter as unknown as AxiosAdapter,
            hooks: { onLoading }
        });

        const players = await http.get<unknown[]>('/api/players', { eligible: true });
        expect(Array.isArray(players)).toBe(true);
        expect(players.length).toBeGreaterThan(0);
        expect(adapter).not.toHaveBeenCalled();
        expect(onLoading).not.toHaveBeenCalled();
    });

    it('mock 查表支援 :id 路徑參數', async () => {
        const http = createHttp({ baseURL: '', useMock: true, hooks: {} });
        const material = await http.get<{ id: number }>('/api/materials/3');
        expect(material.id).toBe(3);
    });
});

describe('resolveErrorMessage', () => {
    it('通用 HTTP 狀態走對照表', () => {
        expect(resolveErrorMessage(new ApiError('x', { code: 'HTTP_ERROR', status: 503 }))).toBe(
            '我們正在提供更好的服務，請稍後再試'
        );
    });

    it('逾時與斷線有專屬訊息', () => {
        expect(resolveErrorMessage(new ApiError('t', { isTimeout: true }))).toBe('連線逾時，請稍後再試');
        expect(resolveErrorMessage(new ApiError('n', { isNetworkError: true }))).toMatch(/系統忙碌|網路連線/);
    });
});
