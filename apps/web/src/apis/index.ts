/**
 * 型別化 endpoint 函式（計畫書 4.6 公開 API；4.7 受保護 API 於功能三／M4 時補）。
 * 呼叫端統一經 composables/useApi.ts 取得已綁定 baseURL 與 hooks 的實例。
 */
import type { HttpClient, RequestOptions } from './http';
import type { Material, MaterialsQuery, Paginated, Player } from '~/types/api';

export function createApi(http: HttpClient) {
    return {
        /** GET /api/materials?playerId=&from=&to=&source=&page= */
        getMaterials(query: MaterialsQuery = {}, options?: RequestOptions) {
            return http.get<Paginated<Material>>('/api/materials', { ...query }, options);
        },
        /** GET /api/materials/:id */
        getMaterial(id: number, options?: RequestOptions) {
            return http.get<Material>(`/api/materials/${id}`, undefined, options);
        },
        /** GET /api/players?eligible=true（頁籤用） */
        getPlayers(params: { eligible?: boolean } = { eligible: true }, options?: RequestOptions) {
            return http.get<Player[]>('/api/players', { ...params }, options);
        }
    };
}

export type Api = ReturnType<typeof createApi>;
