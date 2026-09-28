/**
 * 取得綁定 Nuxt 執行環境的 API client：
 * - baseURL：SSR 走 `runtimeConfig.public.apiBase`（直連 Hono）；client 走 `public.apiClientBase`
 *   （本地預設空字串 → 相對路徑 /api 由 Nitro devProxy 轉送，避免 CORS；正式環境設為 API 網域）。
 * - loading → global store 計數；錯誤 → GlobalDialog（路由已切換則不彈，避免舊頁面的錯誤跳到新頁）。
 */
import { createHttp, type HttpClient } from '~/apis/http';
import { createApi, type Api } from '~/apis';
import { buildErrorDialog } from '~/apis/responseHint';
import { useGlobalStore } from '~/stores/global';

interface RequestContext {
    path: string;
}

export function useApi(): Api {
    const config = useRuntimeConfig();
    const store = useGlobalStore();
    const route = useRoute();

    const http: HttpClient = createHttp<RequestContext>({
        baseURL: import.meta.server ? config.public.apiBase : config.public.apiClientBase,
        hooks: {
            onLoading: (loading) => store.globalLoadingHandler(loading),
            getContext: () => ({ path: route.fullPath }),
            onError: (error, context) => {
                if (import.meta.server) {
                    return;
                }
                if (context?.path !== route.fullPath) {
                    return;
                }
                store.openDialog(buildErrorDialog(error));
            }
        }
    });

    return createApi(http);
}
