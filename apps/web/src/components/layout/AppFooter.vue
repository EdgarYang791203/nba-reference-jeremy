<!--
  @file AppFooter.vue
  @description 站台 footer（設計稿 FOOTER）：版權說明 + 來源與版權聲明 / 聯絡 / 用量。
-->
<template>
    <footer class="relative mt-auto border-t-2 border-line bg-panel-2 text-xs text-muted">
        <div
            class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 lg:px-20"
        >
            <span>© 2026 阿准的隨看隨想 · 本站內容為外電摘要，圖片皆外連並標註來源</span>
            <nav class="flex gap-6" aria-label="頁尾連結">
                <!-- TODO: /about 來源與版權聲明頁（含 Live2D 授權標示，9F.2a） -->
                <NuxtLink to="/about" class="font-medium hover:text-gold">來源與版權聲明</NuxtLink>
                <a href="mailto:73307hank@gmail.com" class="font-medium hover:text-gold">聯絡</a>
                <!-- TODO(M4): /issues/usage 用量頁 -->
                <NuxtLink to="/issues/usage" class="font-medium hover:text-gold">用量</NuxtLink>
            </nav>
        </div>
    </footer>
</template>
