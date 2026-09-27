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
            htmlAttrs: { lang: 'zh-Hant-TW', 'data-theme': 'dark' },
            title: 'NBA 素材站',
            meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
        }
    },

    runtimeConfig: {
        public: {
            // 由 NUXT_PUBLIC_API_BASE 覆蓋
            apiBase: 'http://localhost:8787'
        }
    },

    // 部署 Cloudflare Pages 時以 NITRO_PRESET=cloudflare-pages 指定 preset；ISR 見計畫書 4.8 / 9A.5
    routeRules: {
        '/materials/**': { isr: 3600 },
        '/articles/**': { isr: 600 }
    },

    typescript: { strict: true }
});
