/**
 * 自訂 vue-router scrollBehavior（Nuxt 4：srcDir 下的 router.options.ts 會與預設合併）。
 * 與 Nuxt 預設唯一不同：初次導航（重整／直接進站，from === START_LOCATION）回傳 false，
 * 維持瀏覽器目前位置。預設會在 hydration 完成後捲到 savedPosition 或頂端，使用者在
 * JS 載入期間往下捲的距離會被吃掉（dev 模式 hydration 慢，特別明顯）。
 * 其餘行為沿用預設：同頁 hash 跳轉、換頁等 page:loading:end 後捲頂／捲到 hash。
 */
import type { RouterConfig } from '@nuxt/schema';
import { START_LOCATION } from 'vue-router';

export default {
    scrollBehavior(to, from, savedPosition) {
        if (from === START_LOCATION) {
            return false;
        }

        const scrollToTop = typeof to.meta.scrollToTop === 'function' ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop;
        if (scrollToTop === false) {
            return false;
        }

        // 同頁只換 hash：直接處理，不等 page hook
        if (to.path === from.path) {
            if (from.hash && !to.hash) {
                return { left: 0, top: 0 };
            }
            if (to.hash) {
                return { el: to.hash, top: 0, behavior: 'smooth' };
            }
            return false;
        }

        const nuxtApp = useNuxtApp();
        return new Promise((resolve) => {
            nuxtApp.hooks.hookOnce('page:loading:end', () => {
                requestAnimationFrame(() => {
                    if (savedPosition) {
                        resolve(savedPosition);
                        return;
                    }
                    resolve(to.hash ? { el: to.hash, top: 0 } : { left: 0, top: 0 });
                });
            });
        });
    }
} satisfies RouterConfig;
