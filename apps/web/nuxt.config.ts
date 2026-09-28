// mock 開關：NUXT_PUBLIC_USE_MOCK_API=true 時前端不打 API，走 src/mocks/api 查表（apis/http.ts）
const useMockApi = String(process.env.NUXT_PUBLIC_USE_MOCK_API ?? '') === 'true';
// 本地 Hono dev server；SSR 直連、client 走 Nitro devProxy 相對路徑避免 CORS
const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8787';

export default defineNuxtConfig({
    srcDir: 'src',
    compatibilityDate: '2025-07-15',

    modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@element-plus/nuxt'],

    css: [
        '~/assets/css/tokens.css',
        '~/assets/css/element-overrides.css',
        '~/assets/css/base.css'
    ],

    app: {
        head: {
            htmlAttrs: { lang: 'zh-Hant-TW', 'data-theme': 'dark', class: 'dark' },
            title: 'NBA 素材站',
            meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
            // 首屏前先套 localStorage 的主題，避免亮版使用者看到暗版閃一下（composables/useTheme.ts 之後接手）
            script: [
                {
                    innerHTML:
                        "(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){var r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark');}}catch(e){}})();",
                    tagPosition: 'head'
                }
            ]
        }
    },

    runtimeConfig: {
        public: {
            // SSR 直連的 API base（NUXT_PUBLIC_API_BASE 覆蓋）
            apiBase,
            // client 端 base：空字串 = 相對路徑 /api（本地由 devProxy 轉送）；正式環境設 NUXT_PUBLIC_API_CLIENT_BASE
            // TODO(M4): 正式環境 Cloudflare Pages 與 Cloud Run 不同網域，需搭配 CORS 白名單或 Cloudflare 路由
            apiClientBase: process.env.NUXT_PUBLIC_API_CLIENT_BASE ?? '',
            useMockApi
        }
    },

    vite: {
        define: {
            __USE_MOCK_API__: JSON.stringify(useMockApi)
        }
    },

    nitro: {
        // 本地 dev：/api/* → Hono（target 要含 /api，Nitro 會先剝掉 mount path）
        devProxy: useMockApi
            ? {}
            : {
                  '/api': { target: `${apiBase}/api`, changeOrigin: true, prependPath: true }
              }
    },

    // 部署 Cloudflare Pages 時以 NITRO_PRESET=cloudflare-pages 指定 preset；ISR 見計畫書 4.8 / 9A.5
    routeRules: {
        '/materials/**': { isr: 3600 },
        '/articles/**': { isr: 600 }
    },

    typescript: { strict: true }
});
