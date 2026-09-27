import { createHttp } from '~/apis/http';

/** 取得指向 Hono 後端的 API client（baseURL 由 NUXT_PUBLIC_API_BASE 控制）。 */
export function useApi() {
    const config = useRuntimeConfig();
    return createHttp(config.public.apiBase);
}
