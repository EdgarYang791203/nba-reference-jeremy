/**
 * HTTP 核心（自 fbcom `src/apis/http.ts` 移植改寫）。
 * - 單一 axios instance；request 前後掛全域 loading 計數；同 key 重複請求以 AbortController 取消。
 * - 回應一律解封後端 envelope `{ ok, data } | { ok:false, error }`，非 ok 一律 reject 成 ApiError。
 * - 錯誤提示與 loading 不直接碰 store，改由 hooks 注入（composables/useApi.ts 接 Pinia 與 GlobalDialog），方便測試。
 * - mock 模式：`useMock` 為 true 時先查 mocks/api 查表，命中就直接回資料、不發 HTTP、不動 loading。
 */
import axios, { type AxiosAdapter, type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '~/types/api';
import { resolveMock } from '~/mocks/api';

export interface RequestOptions {
    /** 是否掛全域 loading（預設 true） */
    withGlobalLoading?: boolean;
    /** 失敗時是否交給 onError 彈全域提示（預設 true） */
    isErrorAlert?: boolean;
    /** 允許同 key 重複請求（預設 true；false 時取消前一個） */
    duplicateRequest?: boolean;
    timeout?: number;
    signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RequestOptions, 'signal'>> = {
    withGlobalLoading: true,
    isErrorAlert: true,
    duplicateRequest: true,
    timeout: 30_000
};

export class ApiError extends Error {
    readonly code: string;
    readonly status: number | null;
    readonly isNetworkError: boolean;
    readonly isTimeout: boolean;

    constructor(
        message: string,
        init: { code?: string; status?: number | null; isNetworkError?: boolean; isTimeout?: boolean } = {}
    ) {
        super(message);
        this.name = 'ApiError';
        this.code = init.code ?? 'UNKNOWN';
        this.status = init.status ?? null;
        this.isNetworkError = init.isNetworkError ?? false;
        this.isTimeout = init.isTimeout ?? false;
    }
}

export interface HttpHooks<Ctx = unknown> {
    /** 每個真實請求開始 / 結束各呼叫一次（mock 命中不呼叫） */
    onLoading?: (loading: boolean) => void;
    /** 請求發起時擷取的上下文（如目前路由），錯誤時原樣帶回 */
    getContext?: () => Ctx;
    /** isErrorAlert 為 true 的失敗會進來（取消的請求不會） */
    onError?: (error: ApiError, context: Ctx) => void;
}

export interface CreateHttpOptions<Ctx = unknown> {
    baseURL: string;
    hooks?: HttpHooks<Ctx>;
    /** 預設讀編譯期 __USE_MOCK_API__；測試可明確指定 */
    useMock?: boolean;
    /** 測試注入用 */
    adapter?: AxiosAdapter;
}

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface HttpClient {
    request<T>(method: HttpMethod, url: string, config?: AxiosRequestConfig, options?: RequestOptions): Promise<T>;
    get<T>(url: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T>;
    post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T>;
    patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(url: string, options?: RequestOptions): Promise<T>;
}

function readMockFlag(): boolean {
    return typeof __USE_MOCK_API__ !== 'undefined' && __USE_MOCK_API__ === true;
}

function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
        return error;
    }
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
        const status = axiosError.response?.status ?? null;
        const body = axiosError.response?.data;
        if (body && typeof body === 'object' && 'ok' in body && body.ok === false) {
            return new ApiError(body.error.message, { code: body.error.code, status });
        }
        const isTimeout = axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT';
        const isNetworkError = !axiosError.response && !isTimeout;
        return new ApiError(axiosError.message, {
            code: axiosError.code ?? 'HTTP_ERROR',
            status,
            isNetworkError,
            isTimeout
        });
    }
    return new ApiError(error instanceof Error ? error.message : String(error));
}

export function createHttp<Ctx = unknown>(init: CreateHttpOptions<Ctx>): HttpClient {
    const instance = axios.create({
        baseURL: init.baseURL,
        timeout: DEFAULT_OPTIONS.timeout,
        adapter: init.adapter
    });
    const hooks = init.hooks ?? {};
    const useMock = init.useMock ?? readMockFlag();
    const controllers = new Map<string, AbortController>();

    async function request<T>(
        method: HttpMethod,
        url: string,
        config: AxiosRequestConfig = {},
        options: RequestOptions = {}
    ): Promise<T> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        if (useMock) {
            const mock = resolveMock(method, url, config.params ?? {}, config.data);
            if (mock.matched) {
                return mock.data as T;
            }
        }

        const key = `${method.toUpperCase()} ${url}`;
        if (!opts.duplicateRequest) {
            controllers.get(key)?.abort();
        }
        const controller = new AbortController();
        controllers.set(key, controller);

        const context = hooks.getContext?.() as Ctx;
        if (opts.withGlobalLoading) {
            hooks.onLoading?.(true);
        }

        try {
            const response = await instance.request<ApiEnvelope<T>>({
                ...config,
                method,
                url,
                timeout: opts.timeout,
                signal: options.signal ?? controller.signal
            });
            const body = response.data;
            if (body && typeof body === 'object' && 'ok' in body) {
                if (body.ok) {
                    return body.data;
                }
                throw new ApiError(body.error.message, {
                    code: body.error.code,
                    status: response.status
                });
            }
            throw new ApiError('Unexpected response shape', {
                code: 'BAD_ENVELOPE',
                status: response.status
            });
        } catch (error) {
            if (axios.isCancel(error)) {
                throw error;
            }
            const apiError = toApiError(error);
            if (opts.isErrorAlert) {
                hooks.onError?.(apiError, context);
            }
            throw apiError;
        } finally {
            if (controllers.get(key) === controller) {
                controllers.delete(key);
            }
            if (opts.withGlobalLoading) {
                hooks.onLoading?.(false);
            }
        }
    }

    return {
        request,
        get: (url, params, options) => request('get', url, { params }, options),
        post: (url, data, options) => request('post', url, { data }, options),
        patch: (url, data, options) => request('patch', url, { data }, options),
        delete: (url, options) => request('delete', url, {}, options)
    };
}
