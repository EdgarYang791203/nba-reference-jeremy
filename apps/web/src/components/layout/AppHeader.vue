<!--
  @file AppHeader.vue
  @description 站台 header（設計稿 NAV）：像素品牌字、導覽（當前項 ▶）、搜尋框、亮暗切換、Google 登入。
  搜尋與登入僅 UI：TODO(討論): 搜尋 API；TODO(M4): Cloudflare Access 登入入口。
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '~/composables/useTheme';

const route = useRoute();
const { theme, toggleTheme } = useTheme();

const navItems = computed(() => [
    { to: '/materials', label: '素材庫' },
    { to: '/articles', label: '待發佈文章' }, // TODO(功能二)
    { to: '/about', label: '來源說明' } // TODO: 來源與版權聲明頁（9F.2）
]);

function isActive(to: string) {
    return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
    <header class="relative border-b-2 border-line bg-panel-2">
        <div
            class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-20"
        >
            <NuxtLink to="/materials" class="flex items-center gap-2.5" aria-label="回首頁">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" class="shrink-0">
                    <rect x="0" y="0" width="20" height="4" class="fill-gold" />
                    <rect x="2" y="4" width="16" height="8" class="fill-gold" />
                    <rect x="4" y="12" width="12" height="4" class="fill-gold" />
                    <rect x="7" y="16" width="6" height="4" class="fill-gold" />
                </svg>
                <span class="font-pixel text-2xl leading-none text-cream">阿准的隨看隨想．Wiki</span>
            </NuxtLink>

            <nav class="flex items-center gap-7" aria-label="主導覽">
                <NuxtLink
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to"
                    class="flex items-center gap-1.5 text-sm"
                    :class="isActive(item.to) ? 'font-bold text-cream' : 'font-medium text-muted hover:text-cream'"
                >
                    <span
                        v-if="isActive(item.to)"
                        class="font-press text-[8px] text-gold"
                        aria-hidden="true"
                    >
                        ▶
                    </span>
                    {{ item.label }}
                </NuxtLink>
            </nav>

            <div class="flex items-center gap-3">
                <label
                    class="hidden h-9 w-[280px] items-center gap-2 border-2 border-line bg-panel-2 px-3 text-[13px] text-muted md:flex"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-4-4" />
                    </svg>
                    <!-- TODO(討論): 搜尋 API 尚未定義，先只做 UI -->
                    <input
                        type="search"
                        placeholder="搜尋球員、來源、關鍵字"
                        aria-label="搜尋"
                        class="flex-1 bg-transparent text-cream outline-none placeholder:text-muted"
                        disabled
                    />
                </label>

                <button
                    type="button"
                    aria-label="切換亮暗版"
                    class="flex items-center gap-1.5 border-2 border-line bg-panel-2 px-2 py-1.5 text-xs font-bold text-cream hover:border-gold"
                    @click="toggleTheme"
                >
                    <span class="font-press text-[10px] text-gold" aria-hidden="true">
                        {{ theme === 'dark' ? '☾' : '☀' }}
                    </span>
                    {{ theme === 'dark' ? '暗' : '亮' }}
                    <span class="font-medium text-muted">/ {{ theme === 'dark' ? '亮' : '暗' }}</span>
                </button>

                <!-- TODO(M4): Cloudflare Access（Google IdP）登入入口 -->
                <button
                    type="button"
                    class="bg-gold px-3.5 py-2 text-[13px] font-bold text-on-gold hover:brightness-110"
                    disabled
                    title="尚未開放"
                >
                    Google 登入
                </button>
            </div>
        </div>
    </header>
</template>
