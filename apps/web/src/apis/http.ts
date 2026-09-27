/** API client 封裝。呼叫端統一走這裡，之後統一掛錯誤處理與 loading。 */
import { $fetch, type $Fetch } from 'ofetch';

export function createHttp(baseURL: string): $Fetch {
    return $fetch.create({
        baseURL,
        retry: 0
    });
}
