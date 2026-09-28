/**
 * Mock API 查表（取代 fbcom 的 if-chain）。`__USE_MOCK_API__` 為 true 時 apis/http.ts 先查這裡，
 * 命中即回資料、不發 HTTP。路徑支援 `:param`。
 * 正式 build 時 nuxt.config 的 define 為 false，此模組雖仍被 import，但 handler 不會執行；
 * TODO(討論): 若要把 mock 從 bundle 剔除，可仿 fbcom 的 stub-mocks-in-prod vite plugin。
 */
import { getMockMaterial, getMockMaterials } from './materials';
import { getMockPlayers } from './players';

export interface MockContext {
    params: Record<string, unknown>;
    body: unknown;
    pathParams: Record<string, string>;
}

type MockHandler = (ctx: MockContext) => unknown;

interface MockRoute {
    method: string;
    pattern: RegExp;
    keys: string[];
    handler: MockHandler;
}

const routes: MockRoute[] = [];

function register(method: string, path: string, handler: MockHandler) {
    const keys: string[] = [];
    const pattern = new RegExp(
        '^' +
            path.replace(/:([A-Za-z0-9_]+)/g, (_m, key: string) => {
                keys.push(key);
                return '([^/]+)';
            }) +
            '/?$'
    );
    routes.push({ method: method.toLowerCase(), pattern, keys, handler });
}

register('get', '/api/materials', ({ params }) => getMockMaterials(params));
register('get', '/api/materials/:id', ({ pathParams }) => getMockMaterial(Number(pathParams.id)));
register('get', '/api/players', ({ params }) => getMockPlayers(params));

export function resolveMock(
    method: string,
    url: string,
    params: Record<string, unknown> = {},
    body: unknown = undefined
): { matched: true; data: unknown } | { matched: false } {
    const path = url.split('?')[0];
    for (const route of routes) {
        if (route.method !== method.toLowerCase()) {
            continue;
        }
        const match = route.pattern.exec(path);
        if (!match) {
            continue;
        }
        const pathParams: Record<string, string> = {};
        route.keys.forEach((key, index) => {
            pathParams[key] = decodeURIComponent(match[index + 1]);
        });
        return { matched: true, data: route.handler({ params, body, pathParams }) };
    }
    return { matched: false };
}
